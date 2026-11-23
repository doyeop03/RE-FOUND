"use client";

import { getGenerativeModel, type ObjectSchema, type Part } from "firebase/ai";
import type { z } from "zod";
import { GEMINI_MODEL, getAIService, getDirectKey } from "@/lib/firebase/client";
import { ERROR_MESSAGE, ScanError, toScanError } from "./errors";
import { compareSchema, descriptionSchema, garmentAnalysisSchema, shotReviewSchema, storySchema } from "./gemini-schemas";
import { blobToBase64 } from "./image";
import { comparePrompt, descriptionPrompt, garmentAnalysisPrompt, shotReviewPrompt, storyPrompt } from "./prompts";
import { guardDescription, guardStory, sanitizeAnalysis, sanitizeShotReview } from "./sanitize";
import { CompareSchema, DescriptionSchema, GarmentAnalysisSchema, ShotReviewSchema, StorySchema } from "./schemas";
import type { AnalysisImage, ShotInput, ShotReviewer } from "./reviewer";

/**
 * Firebase AI Logic(Gemini Developer API) 구현.
 * - responseMimeType application/json + responseSchema 로 구조화된 응답을 받는다.
 * - 응답은 zod 로 다시 검증하고, sanitize 로 규칙 위반 값을 걸러 낸다.
 * - 네트워크 · 서버 오류는 1회만 자동 재시도한다. 나머지는 ScanError 로 올려 화면에서 재시도 버튼을 보여 준다.
 */

const TIMEOUT = { review: 45_000, analysis: 120_000, small: 45_000 };

async function imagePart(blob: Blob): Promise<Part> {
  return { type: "inlineData", inlineData: { mimeType: blob.type || "image/jpeg", data: await blobToBase64(blob) } } as Part;
}

/** Firebase Schema JSON → Gemini REST responseSchema (타입 대문자, nullable:false 제거) */
function toRestSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toRestSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "nullable" && v === false) continue;
    if (k === "type" && typeof v === "string") out[k] = v.toUpperCase();
    else if (k === "enum" || k === "required") out[k] = v;
    else out[k] = toRestSchema(v);
  }
  return out;
}

/** 기본 모델이 혼잡(503) · 한도 초과(429) · 서버 오류(500)일 때 대신 쓰는 모델 (같은 키로 이미지 + 응답 스키마 동작 확인) */
const FALLBACK_MODEL = "gemini-3.5-flash";
/** 기본 모델이 혼잡하면 이 시각까지는 바로 대체 모델로 보낸다 — 사진마다 혼잡한 모델을 먼저 두드리지 않도록 */
const PRIMARY_COOLDOWN_MS = 3 * 60_000;
let primaryBusyUntil = 0;

type GeminiBody = {
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
} | null;

/** Gemini API 키로 generativelanguage REST 를 직접 호출하고 응답 텍스트를 돌려준다 */
async function generateDirect(schema: ObjectSchema, parts: (string | Part)[], timeout: number, signal?: AbortSignal): Promise<string> {
  const restParts = parts.map((p) =>
    typeof p === "string" ? { text: p } : { inlineData: (p as { inlineData: { mimeType: string; data: string } }).inlineData },
  );
  const timeoutSignal = AbortSignal.timeout(timeout);
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: restParts }],
    generationConfig: { responseMimeType: "application/json", responseSchema: toRestSchema(JSON.parse(JSON.stringify(schema))), temperature: 0.1 },
  });
  const post = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": getDirectKey() },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
      body: requestBody,
    });
  const busy = (status: number) => status === 503 || status === 429 || status === 500;

  const canFallback = GEMINI_MODEL !== FALLBACK_MODEL;
  let model = canFallback && Date.now() < primaryBusyUntil ? FALLBACK_MODEL : GEMINI_MODEL;
  let res = await post(model);
  if (canFallback && model === GEMINI_MODEL && busy(res.status)) {
    primaryBusyUntil = Date.now() + PRIMARY_COOLDOWN_MS;
    model = FALLBACK_MODEL;
    res = await post(model);
  }

  const body = (await res.json().catch(() => null)) as GeminiBody;
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) throw new ScanError("not_configured", "Gemini API 키가 올바르지 않습니다. 스캔 화면에서 키를 다시 입력해 주세요.", msg);
    if (res.status === 403) throw new ScanError("not_configured", "Gemini API 키에 이 모델을 쓸 권한이 없습니다.", msg);
    if (res.status === 404) throw new ScanError("not_configured", `모델 ${model} 을(를) 찾을 수 없습니다. NEXT_PUBLIC_GEMINI_MODEL 을 확인해 주세요.`, msg);
    throw Object.assign(new Error(`[${res.status}] ${msg}`), { customErrorData: { status: res.status } });
  }
  if (body?.promptFeedback?.blockReason) throw new ScanError("blocked", ERROR_MESSAGE.blocked, body.promptFeedback.blockReason);
  const cand = body?.candidates?.[0];
  if (cand?.finishReason && /SAFETY|PROHIBITED|BLOCKLIST|SPII/.test(cand.finishReason)) throw new ScanError("blocked", ERROR_MESSAGE.blocked, cand.finishReason);
  const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  if (!text) throw new ScanError("invalid_response", ERROR_MESSAGE.invalid_response, `빈 응답 (finishReason: ${cand?.finishReason ?? "없음"})`);
  return text;
}

async function callStructured<T>(
  schema: ObjectSchema,
  validator: z.ZodType<T>,
  parts: (string | Part)[],
  timeout: number,
  signal?: AbortSignal,
): Promise<T> {
  const generate: () => Promise<string> = getDirectKey()
    ? () => generateDirect(schema, parts, timeout, signal)
    : (() => {
        const model = getGenerativeModel(
          getAIService(),
          {
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1 },
          },
          { timeout },
        );
        return async () => (await model.generateContent(parts, { signal, timeout })).response.text();
      })();

  let lastError: ScanError | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal?.aborted) throw new ScanError("aborted", ERROR_MESSAGE.aborted);
    try {
      const text = await generate();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new ScanError("invalid_response", ERROR_MESSAGE.invalid_response, String(e));
      }
      const parsed = validator.safeParse(json);
      if (!parsed.success) {
        throw new ScanError("invalid_response", ERROR_MESSAGE.invalid_response, parsed.error.message.slice(0, 400));
      }
      return parsed.data;
    } catch (err) {
      lastError = toScanError(err);
      const transient = lastError.kind === "network" || lastError.kind === "server";
      if (!transient || attempt === 1) throw lastError;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastError ?? new ScanError("unknown", ERROR_MESSAGE.unknown);
}

export class GeminiImageReviewer implements ShotReviewer {
  readonly model = GEMINI_MODEL;

  async reviewShot(input: ShotInput, signal?: AbortSignal) {
    const out = await callStructured(
      shotReviewSchema,
      ShotReviewSchema,
      [shotReviewPrompt(input.target, input.imageId, input.attempt), `IMAGE ${input.imageId}`, await imagePart(input.blob)],
      TIMEOUT.review,
      signal,
    );
    return sanitizeShotReview(out);
  }

  async analyzeGarment(images: AnalysisImage[], signal?: AbortSignal) {
    const parts: (string | Part)[] = [garmentAnalysisPrompt(images)];
    for (const im of images) {
      parts.push(`IMAGE ${im.id}`, await imagePart(im.blob));
    }
    const out = await callStructured(garmentAnalysisSchema, GarmentAnalysisSchema, parts, TIMEOUT.analysis, signal);
    return sanitizeAnalysis(out, images.map((i) => i.id));
  }

  async compareWithReference(user: Blob, reference: Blob, candidateName: string, signal?: AbortSignal) {
    return callStructured(
      compareSchema,
      CompareSchema,
      [comparePrompt(candidateName), "IMAGE A (user photo)", await imagePart(user), "IMAGE B (reference)", await imagePart(reference)],
      TIMEOUT.small,
      signal,
    );
  }

  async writeDescription(facts: Record<string, unknown>, observations: Record<string, unknown>, signal?: AbortSignal) {
    const out = await callStructured(
      descriptionSchema,
      DescriptionSchema,
      [descriptionPrompt(JSON.stringify(facts), JSON.stringify(observations))],
      TIMEOUT.small,
      signal,
    );
    return guardDescription(out, facts);
  }

  async writeStory(product: Record<string, unknown>, sources: { id: string; scope: string; excerpt: string; publisher: string }[], signal?: AbortSignal) {
    if (sources.length === 0) return [];
    const out = await callStructured(storySchema, StorySchema, [storyPrompt(JSON.stringify(product), JSON.stringify(sources))], TIMEOUT.small, signal);
    return guardStory(out, sources);
  }
}
