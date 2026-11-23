"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronRight, Database, LoaderCircle, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cx } from "@/lib/format";
import { GEMINI_MODEL, firebaseStatus, getDirectKey, hasSavedKey, saveDirectKey, subscribeDirectKey, type FirebaseStatus } from "@/lib/firebase/client";
import { supabaseConfigured } from "@/lib/supabase/client";
import { buildScanRecord, fallbackDescription } from "@/lib/scan/build-record";
import { ERROR_MESSAGE, ScanError, toScanError } from "@/lib/scan/errors";
import {
  MAX_ATTEMPTS,
  acceptUnreviewed,
  acceptedImages,
  applyShot,
  createFlow,
  currentStepIndex,
  decideFromReview,
  forceAccept,
  isCaptureDone,
  skipStep,
  type FlowState,
} from "@/lib/scan/flow";
import { GeminiImageReviewer } from "@/lib/scan/gemini-reviewer";
import { applySimilarity, buildCandidates, summarizeMatch, type Candidate } from "@/lib/scan/match";
import { normalizeCode } from "@/lib/scan/sanitize";
import type { GarmentAnalysis } from "@/lib/scan/schemas";
import { newId, type ScanImageMeta, type ScanSession } from "@/lib/scan/session";
import { getBlob, listSessions, saveBlob, saveSession } from "@/lib/scan/session-store";
import { fetchImageBlob, findProductsByCode, getMarketListings, productImageUrl, searchProductsByKeywords, type DbProduct } from "@/services/product-db";
import { uploadSession } from "@/services/scan-upload";
import type { DescriptionLine, StoryBlock } from "@/types/archive-record";
import { CameraCapture, type Captured } from "./CameraCapture";
import { CandidatePicker } from "./CandidatePicker";
import { StepRail } from "./StepRail";

/**
 * 실제 스캔 흐름.
 * 카메라(CameraCapture) ↔ 단계 상태 머신(lib/scan/flow) ↔ AI(ShotReviewer) ↔ 상품 DB(services/product-db) 를 잇는다.
 * Mock Data 는 참조하지 않는다. 결과는 /archive/scan/?session=… 의 상세 페이지로 넘어간다.
 */

type Phase = "intro" | "capture" | "analyzing" | "select" | "finalizing";

const PROGRESS = ["사진 종합 분석", "케어라벨 품번으로 상품 DB 조회", "기준 사진과 비교", "상세 페이지 구성"];

export function ScanFlow() {
  const router = useRouter();
  const reviewer = useMemo(() => new GeminiImageReviewer(), []);
  // 키는 브라우저(localStorage)에 있다. 정적 빌드 HTML 과 첫 렌더를 맞추려고 외부 저장소로 구독한다
  // 서버 스냅샷 null = 아직 확인 전. 클라이언트 스냅샷은 원시값이라 매 렌더 안정적이다
  const keySnapshot = useSyncExternalStore(
    subscribeDirectKey,
    () => `${hasSavedKey() ? "saved" : "env"}:${getDirectKey()}`,
    () => null,
  );
  const fbState = useMemo<FirebaseStatus | null>(() => (keySnapshot === null ? null : firebaseStatus()), [keySnapshot]);
  const fb: FirebaseStatus = fbState ?? { configured: false, missing: [], appCheck: "missing", model: GEMINI_MODEL, mode: "firebase" };
  const keySaved = keySnapshot?.startsWith("saved:") ?? false;
  const [keyInput, setKeyInput] = useState("");
  const [keyEditing, setKeyEditing] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const submitKey = (value: string) => {
    const v = value.trim();
    if (v && !/^[A-Za-z0-9_-]{20,}$/.test(v)) {
      setKeyMessage("키 형식이 올바르지 않습니다. 복사한 키 전체를 붙여 넣어 주세요.");
      return;
    }
    if (!saveDirectKey(v)) {
      setKeyMessage("이 브라우저에서는 키를 저장할 수 없습니다(사생활 보호 모드 등).");
      return;
    }
    setKeyInput("");
    setKeyEditing(false);
    setKeyMessage(v ? "이 기기에 키를 저장했습니다." : "저장된 키를 삭제했습니다.");
  };
  const showKeyForm = keyEditing || (fbState !== null && !fb.configured);
  const dbReady = useMemo(() => supabaseConfigured(), []);

  const [phase, setPhase] = useState<Phase>("intro");
  const [consentAnalysis, setConsentAnalysis] = useState(false);
  const [consentStorage, setConsentStorage] = useState(false);
  const [session, setSession] = useState<ScanSession | null>(null);
  const [pending, setPending] = useState<Captured | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [stepError, setStepError] = useState<ScanError | null>(null);
  const [phaseError, setPhaseError] = useState<{ message: string; retry: () => void } | null>(null);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recent, setRecent] = useState<ScanSession[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const analysisRef = useRef<GarmentAnalysis | null>(null);
  const sessionRef = useRef<ScanSession | null>(null);

  useEffect(() => {
    listSessions().then(setRecent).catch(() => setRecent([]));
    return () => abortRef.current?.abort();
  }, []);

  const commit = useCallback((next: ScanSession) => {
    sessionRef.current = next;
    setSession(next);
    void saveSession(next).catch(() => undefined);
  }, []);

  const signal = () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  };

  /* ───── 시작 ───── */
  const start = () => {
    const now = new Date().toISOString();
    commit({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      consent: { analysis: true, storage: consentStorage && dbReady, at: now },
      model: reviewer.model,
      flow: createFlow(),
      images: [],
      analysis: null,
      match: null,
      product: null,
      record: null,
      remote: null,
    });
    setPhase("capture");
    window.scrollTo({ top: 0 });
  };

  const flow = session?.flow;
  const idx = flow ? currentStepIndex(flow) : -1;
  const step = flow && idx >= 0 ? flow.steps[idx] : null;

  /* ───── 촬영 ───── */
  const onCaptured = (c: Captured) => {
    setStepError(null);
    pendingIdRef.current = newId();
    setPending(c);
  };

  const discardPending = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    pendingIdRef.current = null;
  };

  const updateFlow = (s: ScanSession, nextFlow: FlowState, images: ScanImageMeta[]) => {
    const next = { ...s, flow: nextFlow, images };
    commit(next);
    if (isCaptureDone(nextFlow)) void runAnalysis(next);
  };

  const confirmShot = async () => {
    const s = sessionRef.current;
    if (!s || !step || !pending || !pendingIdRef.current) return;
    const imageId = pendingIdRef.current;
    const q = pending.quality;
    await saveBlob(imageId, pending.blob);

    const meta: ScanImageMeta = {
      id: imageId,
      stepId: step.id,
      target: step.target,
      createdAt: new Date().toISOString(),
      width: pending.width,
      height: pending.height,
      blurScore: q.blurScore,
      brightness: q.brightness,
      source: pending.source,
      review: null,
      decision: "pending",
      qualityOverride: q.blurry || q.dark,
    };
    const images = [...s.images.filter((i) => i.id !== imageId), meta];

    setReviewing(true);
    setStepError(null);
    try {
      const review = await reviewer.reviewShot({ imageId, blob: pending.blob, target: step.target, attempt: step.attempts + 1 }, signal());
      const decision = decideFromReview(step.target, review);
      const nextImages = images.map((i) => (i.id === imageId ? { ...i, review, decision: decision.kind } : i));
      setPending(null);
      pendingIdRef.current = null;
      updateFlow(s, applyShot(s.flow, step.id, imageId, decision, review), nextImages);
    } catch (err) {
      const e = toScanError(err);
      if (e.kind !== "aborted") setStepError(e);
      commit({ ...s, images });
    } finally {
      setReviewing(false);
    }
  };

  /** AI 오류 시 — 검토 없이 이 사진으로 진행 (단계에는 'AI 검토 없음'으로 남는다) */
  const continueWithoutReview = () => {
    const s = sessionRef.current;
    if (!s || !step || !pendingIdRef.current) return;
    const imageId = pendingIdRef.current;
    const images = s.images.map((i) => (i.id === imageId ? { ...i, decision: "unreviewed" as const } : i));
    setPending(null);
    pendingIdRef.current = null;
    setStepError(null);
    updateFlow(s, acceptUnreviewed(s.flow, step.id, imageId), images);
  };

  const skip = () => {
    const s = sessionRef.current;
    if (!s || !step) return;
    discardPending();
    updateFlow(s, skipStep(s.flow, step.id), s.images);
  };

  const useLastPhoto = () => {
    const s = sessionRef.current;
    if (!s || !step) return;
    updateFlow(s, forceAccept(s.flow, step.id), s.images);
  };

  /* ───── 최종 분석 · 제품 식별 ───── */
  const runAnalysis = async (s: ScanSession) => {
    setPhase("analyzing");
    setPhaseError(null);
    setProgress(0);
    window.scrollTo({ top: 0 });
    const sig = signal();
    try {
      const used = acceptedImages(s.flow);
      const blobs = await Promise.all(used.map((u) => getBlob(u.imageId)));
      const images = used
        .map((u, i) => ({ id: u.imageId, target: u.target, reviewed: u.reviewed, blob: blobs[i] as Blob }))
        .filter((i) => i.blob);
      if (!images.length) throw new ScanError("unknown", "분석할 사진이 없습니다. 다시 촬영해 주세요.");

      const analysis = await reviewer.analyzeGarment(images, sig);
      analysisRef.current = analysis;
      const withAnalysis = { ...s, analysis };
      commit(withAnalysis);

      setProgress(1);
      const code = normalizeCode(analysis.care_label.product_code.value);
      const byCode: Awaited<ReturnType<typeof findProductsByCode>> = code ? await findProductsByCode(code) : { ok: true, data: [] };
      if (!byCode.ok && byCode.reason === "not_configured") {
        const match = summarizeMatch("db_unavailable", null, code, 0);
        return finalize({ ...withAnalysis, match }, null);
      }
      if (!byCode.ok) throw new ScanError("server", `상품 DB 조회 실패: ${byCode.message}`);
      const kw = await searchProductsByKeywords([analysis.garment.category.value ?? ""].filter(Boolean));
      const list = buildCandidates(analysis, byCode.data, kw.ok ? kw.data : []);

      setProgress(2);
      const front = images.find((i) => i.target === "front_full")?.blob ?? images[0].blob;
      const compared: Candidate[] = [];
      for (const c of list) {
        const ref = c.product.product_images.find((im) => ["front", "lookbook", "editorial_product"].includes(im.role) && productImageUrl(im));
        const url = ref ? productImageUrl(ref) : null;
        const blob = url && compared.length < 3 ? await fetchImageBlob(url, sig) : null;
        if (!blob) {
          compared.push(c);
          continue;
        }
        try {
          compared.push(applySimilarity(c, await reviewer.compareWithReference(front, blob, c.product.name, sig)));
        } catch {
          compared.push(c); // 비교 실패 — 유사도 없이 후보로만 둔다
        }
      }
      compared.sort((a, b) => b.rank - a.rank);
      setCandidates(compared);

      if (!compared.length) {
        return finalize({ ...withAnalysis, match: summarizeMatch("unconfirmed", null, code, 0) }, null);
      }
      setPhase("select");
      window.scrollTo({ top: 0 });
    } catch (err) {
      const e = toScanError(err);
      if (e.kind === "aborted") return;
      setPhaseError({ message: e.message || ERROR_MESSAGE[e.kind], retry: () => void runAnalysis(sessionRef.current ?? s) });
    }
  };

  const choose = (c: Candidate | null) => {
    const s = sessionRef.current;
    if (!s?.analysis) return;
    const code = normalizeCode(s.analysis.care_label.product_code.value);
    void finalize({ ...s, match: summarizeMatch(c ? "confirmed" : "unconfirmed", c, code, candidates.length) }, c?.product ?? null);
  };

  const finalize = async (s: ScanSession, product: DbProduct | null) => {
    setPhase("finalizing");
    setPhaseError(null);
    setProgress(3);
    const analysis = s.analysis as GarmentAnalysis;
    const sig = signal();
    try {
      const listingsRes = product ? await getMarketListings(product.id) : null;
      const listings = listingsRes?.ok ? listingsRes.data : [];

      // 설명 — 확인된 상품 사실 + 사진 관찰만 사용. 실패하면 사실 · 관찰을 그대로 옮긴다.
      let description: DescriptionLine[] = fallbackDescription(product, analysis);
      if (product) {
        const facts: Record<string, unknown> = Object.fromEntries(
          Object.entries({
            name: product.name,
            collection: product.collection,
            release_year: product.release_year,
            release_season: product.release_season,
            category: product.category,
            color: product.color,
            material: product.material,
            official_description: product.description,
          }).filter(([, v]) => v !== null && v !== ""),
        );
        const observations = { summary: analysis.summary_ko, color: analysis.garment.color.value, features: analysis.garment.design_features.value };
        try {
          const lines = await reviewer.writeDescription(facts, observations, sig);
          if (lines.length) {
            const ids = product.product_sources.map((x) => x.id);
            description = lines.map((l) => ({ text: l.text, basis: l.basis, sourceIds: l.basis === "product_db" ? ids : undefined }));
          }
        } catch {
          // 생성 실패 시 fallbackDescription 유지
        }
      }

      // 아카이브 스토리 — 출처 원문 발췌가 있을 때만
      let story: StoryBlock[] = [];
      const excerpts = (product?.product_sources ?? []).filter((x) => x.excerpt).map((x) => ({ id: x.id, scope: x.scope, excerpt: x.excerpt as string, publisher: x.publisher }));
      if (product && excerpts.length) {
        try {
          const blocks = await reviewer.writeStory({ name: product.name, collection: product.collection, release_year: product.release_year }, excerpts, sig);
          story = blocks.map((b) => {
            const scopes = b.source_ids.map((id) => excerpts.find((e) => e.id === id)?.scope);
            const scope = scopes.includes("product") ? "product" : scopes.includes("collection") ? "collection" : "brand";
            return { title: b.title, body: b.body, scope, sourceIds: b.source_ids, generatedBy: "gemini" as const };
          });
        } catch {
          story = [];
        }
      }

      const productImageUrls = Object.fromEntries((product?.product_images ?? []).map((im) => [im.id, productImageUrl(im)]));
      const record = buildScanRecord({ session: s, analysis, product, productImageUrls, listings, description, story });
      let done: ScanSession = { ...s, product, record };
      commit(done);

      if (done.consent.storage) {
        const up = await uploadSession(done);
        done = { ...done, remote: up.ok ? { status: "uploaded", at: new Date().toISOString() } : { status: "failed", error: up.error } };
      } else {
        done = { ...done, remote: { status: "skipped" } };
      }
      commit(done);
      await saveSession(done);
      router.push(`/archive/scan/?session=${done.id}`);
    } catch (err) {
      const e = toScanError(err);
      if (e.kind === "aborted") return;
      setPhaseError({ message: e.message, retry: () => void finalize(s, product) });
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    discardPending();
    setSession(null);
    sessionRef.current = null;
    setPhase("intro");
    setStepError(null);
    setPhaseError(null);
  };

  /* ───── 화면 ───── */
  const exhaustedRequired = step?.required && step.attempts >= MAX_ATTEMPTS && step.imageIds.length > 0;
  const totalSteps = (flow?.steps.length ?? 3) + 1;

  return (
    <div className="container-page max-w-[760px] pt-6 md:pt-10">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-brand">Scan · 실물 검수</p>
        {phase !== "intro" && (
          <button type="button" onClick={cancel} className="-mr-2 h-11 px-2 text-[13px] font-semibold text-sub hover:text-ink">
            처음으로
          </button>
        )}
      </div>

      {flow && phase !== "intro" && (
        <div className="mt-4">
          <StepRail steps={flow.steps} currentId={phase === "capture" ? step?.id ?? null : null} finalActive={phase !== "capture"} />
        </div>
      )}

      {phase === "intro" && (
        <section className="animate-page pt-8">
          <h1 className="text-[30px] font-extrabold leading-[1.15] tracking-[-0.035em] md:text-[40px]">
            발견한 옷을
            <br />
            단계별로 촬영해 주세요
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-sub">
            앞면 → 뒷면 → 케어라벨 순서로 촬영하면 AI가 사진마다 확인하고, 필요한 부위를 추가로 요청합니다. AI 분석은 정품 인증이 아닙니다.
          </p>

          <ol className="mt-6 grid grid-cols-5 gap-1 text-center text-[11px] font-bold">
            {["앞면", "뒷면", "케어라벨", "추가 부위", "최종 분석"].map((s, i) => (
              <li key={s} className="border-t-[3px] border-ink pt-2">
                <span className="display block text-[22px] text-brand">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>

          {/* 연결 상태 */}
          <div className="mt-8 divide-y divide-line border-y border-ink">
            <div className="flex items-start gap-3 py-3">
              <Sparkles size={18} className={fb.configured ? "text-ink" : "text-faint"} />
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-bold">AI 분석 · {fb.mode === "direct" ? "Gemini API 키" : "Firebase AI Logic"} ({fb.model})</p>
                <p className="text-sub">
                  {fbState === null
                    ? "확인 중…"
                    : fb.mode === "direct"
                      ? keySaved
                        ? "연결됨 · 이 기기에 저장된 키로 Gemini 를 호출합니다"
                        : "연결됨 · .env.local 의 키로 Gemini 를 호출합니다"
                      : fb.configured
                        ? `연결됨 · App Check ${fb.appCheck === "debug" ? "디버그 토큰(로컬 개발)" : "reCAPTCHA Enterprise"}`
                        : "Gemini API 키를 입력하면 바로 쓸 수 있습니다"}
                </p>

                {showKeyForm ? (
                  <form
                    className="mt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitKey(keyInput);
                    }}
                  >
                    <div className="flex gap-2">
                      <input
                        type="password"
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={keyInput}
                        onChange={(e) => {
                          setKeyInput(e.target.value);
                          setKeyMessage(null);
                        }}
                        placeholder="Gemini API 키 붙여 넣기"
                        aria-label="Gemini API 키"
                        className="min-w-0 flex-1 border border-ink bg-white px-3 py-2 text-[14px] outline-none focus:border-brand"
                      />
                      <button type="submit" disabled={!keyInput.trim()} className="shrink-0 bg-ink px-4 text-[13px] font-bold text-white disabled:opacity-40">
                        저장
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
                      키는 이 기기의 브라우저에만 저장되고 서버로 올라가지 않습니다. 사진 분석 요청에만 Google 로 전송됩니다.{" "}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">
                        키 발급
                      </a>
                      {keyEditing && (
                        <>
                          {" · "}
                          <button type="button" className="underline" onClick={() => setKeyEditing(false)}>
                            취소
                          </button>
                        </>
                      )}
                    </p>
                  </form>
                ) : (
                  keySaved && (
                    <p className="mt-1 text-[12px]">
                      <button type="button" className="underline" onClick={() => setKeyEditing(true)}>
                        키 변경
                      </button>
                      {" · "}
                      <button type="button" className="underline" onClick={() => submitKey("")}>
                        이 기기에서 키 삭제
                      </button>
                    </p>
                  )
                )}
                {keyMessage && <p className="mt-1 text-[12px] font-bold text-brand">{keyMessage}</p>}
              </div>
              <span className={cx("text-[12px] font-bold", fb.configured ? "text-ink" : "text-brand")}>{fb.configured ? "준비됨" : "미설정"}</span>
            </div>
            <div className="flex items-start gap-3 py-3">
              <Database size={18} className={dbReady ? "text-ink" : "text-faint"} />
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-bold">상품 DB · Supabase</p>
                <p className="text-sub">{dbReady ? "연결됨 · 품번으로 제품을 조회합니다" : "미연결 · 분석은 가능하지만 제품은 '미확인'으로 표시됩니다"}</p>
              </div>
              <span className={cx("text-[12px] font-bold", dbReady ? "text-ink" : "text-faint")}>{dbReady ? "준비됨" : "미연결"}</span>
            </div>
          </div>

          {/* 동의 */}
          <fieldset className="mt-6 space-y-3">
            <legend className="mb-2 flex items-center gap-1.5 text-[14px] font-extrabold">
              <ShieldCheck size={16} /> 사진 사용 동의
            </legend>
            <label className="flex cursor-pointer items-start gap-3 bg-paper p-4 text-[13px] leading-relaxed">
              <input type="checkbox" checked={consentAnalysis} onChange={(e) => setConsentAnalysis(e.target.checked)} className="mt-0.5 size-5 accent-[#e60012]" />
              <span>
                <b>(필수) AI 분석을 위한 사진 전송</b>
                <br />
                촬영한 사진을 분석을 위해 Google Firebase AI Logic(Gemini)으로 전송합니다. 옷 외에 얼굴 · 개인정보가 찍히지 않게 해 주세요.
              </span>
            </label>
            <label className={cx("flex items-start gap-3 bg-paper p-4 text-[13px] leading-relaxed", dbReady ? "cursor-pointer" : "opacity-60")}>
              <input type="checkbox" disabled={!dbReady} checked={consentStorage && dbReady} onChange={(e) => setConsentStorage(e.target.checked)} className="mt-0.5 size-5 accent-[#e60012]" />
              <span>
                <b>(선택) RE:FOUND 아카이브 서버에 사진 · 분석 결과 저장</b>
                <br />
                분석에 쓴 사진만 비공개로 180일간 보관합니다. 동의하지 않으면 이 기기에만 저장됩니다.
                {!dbReady && " (서버 미연결)"}
              </span>
            </label>
          </fieldset>

          <Button className="mt-6 w-full" disabled={!fb.configured || !consentAnalysis} onClick={start}>
            <Sparkles size={18} /> 촬영 시작
          </Button>
          {!fb.configured && (
            <p className="mt-2 text-center text-[12px] text-sub">
              위에 Gemini API 키를 입력하면 촬영을 시작할 수 있습니다.
            </p>
          )}

          {recent.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow text-sub">Recent · 이 기기의 스캔 기록</p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {recent.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <Link href={`/archive/scan/?session=${r.id}`} className="flex h-14 items-center justify-between gap-3 text-[14px]">
                      <span className="min-w-0 truncate font-bold">{r.record?.displayName}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[12px] text-sub">
                        {r.createdAt.slice(0, 10)} <ChevronRight size={14} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {phase === "capture" && step && (
        <section className="animate-page pt-6">
          <CameraCapture
            target={step.target}
            stepLabel={`STEP ${idx + 1}/${totalSteps} · ${step.kind === "extra" ? "AI 추가 요청" : step.title}`}
            title={step.title}
            guide={step.guide}
            message={step.message}
            pending={pending}
            busy={reviewing}
            onCaptured={onCaptured}
            onRetake={discardPending}
            onConfirm={() => void confirmShot()}
          />

          {step.attempts > 0 && (
            <p className="mt-3 text-[12px] text-sub">
              촬영 {step.attempts}/{MAX_ATTEMPTS}회 · 한도를 넘으면 이 부위는 &lsquo;확인되지 않음&rsquo;으로 기록됩니다.
            </p>
          )}

          {stepError && (
            <div className="mt-4 border border-brand p-4" role="alert">
              <p className="flex items-center gap-2 text-[14px] font-bold text-brand">
                <AlertTriangle size={16} /> AI 확인 실패
              </p>
              <p className="mt-1 text-[13px] leading-relaxed">{stepError.message}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void confirmShot()} className="inline-flex h-11 items-center justify-center gap-1.5 bg-ink text-[13px] font-bold text-white">
                  <RotateCcw size={15} /> 다시 시도
                </button>
                <button type="button" onClick={continueWithoutReview} className="h-11 border border-ink text-[13px] font-bold">
                  AI 검토 없이 계속
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-x-4">
            {exhaustedRequired && (
              <button type="button" onClick={useLastPhoto} className="h-11 text-[13px] font-bold text-brand">
                마지막 사진 그대로 사용
              </button>
            )}
            {!step.required && (
              <button type="button" onClick={skip} className="h-11 text-[13px] font-semibold text-sub underline-offset-4 hover:underline">
                이 부위 건너뛰기 (확인되지 않음으로 기록)
              </button>
            )}
          </div>
        </section>
      )}

      {(phase === "analyzing" || phase === "finalizing") && (
        <section className="animate-page pt-8" aria-live="polite">
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">{phaseError ? "분석을 마치지 못했습니다" : "AI가 분석하고 있어요"}</h1>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {PROGRESS.map((label, i) => {
              const done = i < progress;
              const active = i === progress && !phaseError;
              return (
                <li key={label} className={cx("flex h-12 items-center gap-3 text-[14px]", done || active ? "text-ink" : "text-faint", active && "font-bold")}>
                  <span className={cx("flex size-6 items-center justify-center", done ? "bg-ink text-white" : active ? "text-brand" : "border border-line")}>
                    {done ? <Check size={14} strokeWidth={3} /> : active ? <LoaderCircle size={18} className="animate-spin" /> : null}
                  </span>
                  {label}
                </li>
              );
            })}
          </ul>
          {phaseError ? (
            <div className="mt-5 border border-brand p-4" role="alert">
              <p className="text-[13px] leading-relaxed">{phaseError.message}</p>
              <Button className="mt-3 !h-11 w-full" onClick={phaseError.retry}>
                <RotateCcw size={16} /> 다시 시도
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-[12px] leading-relaxed text-sub">사진 수에 따라 30초에서 1분 정도 걸립니다. 화면을 닫지 말아 주세요.</p>
          )}
        </section>
      )}

      {phase === "select" && session?.analysis && (
        <CandidatePicker candidates={candidates} recognizedCode={normalizeCode(session.analysis.care_label.product_code.value)} onChoose={choose} />
      )}
    </div>
  );
}
