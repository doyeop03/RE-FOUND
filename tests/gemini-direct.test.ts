import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Gemini API 키 직접 호출 — 기본 모델이 혼잡하면 대체 모델로 넘어가는지 (fetch 모킹, 실제 네트워크 호출 없음)
 */

const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }] }), { status: 200 });
const fail = (status: number, message: string) => new Response(JSON.stringify({ error: { message } }), { status });
const LINES = JSON.stringify({ lines: [{ text: "회색 플리스 카디건", basis: "ai_observation", fact_keys: [] }] });

type Reviewer = InstanceType<typeof import("@/lib/scan/gemini-reviewer").GeminiImageReviewer>;
let reviewer: Reviewer;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "test-key-0123456789abcdefghij");
  vi.stubEnv("NEXT_PUBLIC_GEMINI_MODEL", "gemini-primary");
  const mod = await import("@/lib/scan/gemini-reviewer");
  reviewer = new mod.GeminiImageReviewer();
});

afterEach(() => vi.unstubAllGlobals());

const modelOf = (call: unknown[]) => String(call[0]).match(/models\/([^:]+):/)?.[1];

describe("Gemini 직접 호출 · 대체 모델", () => {
  it("기본 모델이 정상이면 기본 모델만 호출하고 키를 헤더로 보낸다", async () => {
    const fetchMock = vi.fn(async () => ok(LINES));
    vi.stubGlobal("fetch", fetchMock);
    const lines = await reviewer.writeDescription({}, {});
    expect(lines).toHaveLength(1);
    expect(fetchMock.mock.calls.map(modelOf)).toEqual(["gemini-primary"]);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key-0123456789abcdefghij");
  });

  it("기본 모델이 503이면 gemini-3.5-flash 로 다시 보내고, 잠시 동안은 바로 대체 모델을 쓴다", async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes("gemini-primary") ? fail(503, "high demand") : ok(LINES)));
    vi.stubGlobal("fetch", fetchMock);
    await reviewer.writeDescription({}, {});
    expect(fetchMock.mock.calls.map(modelOf)).toEqual(["gemini-primary", "gemini-3.5-flash"]);

    await reviewer.writeDescription({}, {});
    expect(fetchMock.mock.calls.map(modelOf)).toEqual(["gemini-primary", "gemini-3.5-flash", "gemini-3.5-flash"]);
  });

  it("키가 틀리면 대체 모델로 넘어가지 않고 키 오류를 알린다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fail(400, "API key not valid. Please pass a valid API key.")));
    await expect(reviewer.writeDescription({}, {})).rejects.toMatchObject({ kind: "not_configured" });
  });
});

describe("키 입력 정리 · 형식", () => {
  it("AQ. 로 시작하는 점 포함 키와 복사 시 딸려 온 공백 · 따옴표 · 접두어를 처리한다", async () => {
    const { cleanKey, looksLikeKey } = await import("@/lib/firebase/client");
    const key = "AQ.Ab8RN6Kb_test-0123456789abcdef";
    expect(looksLikeKey(cleanKey(key))).toBe(true);
    expect(cleanKey(`  "${key}"\n`)).toBe(key);
    expect(cleanKey(`NEXT_PUBLIC_GEMINI_API_KEY=${key}`)).toBe(key);
    expect(looksLikeKey(cleanKey("AIzaSyA-0123456789abcdefghijklmnop"))).toBe(true);
    expect(looksLikeKey("짧음")).toBe(false);
  });
});
