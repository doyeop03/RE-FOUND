"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Database, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Button, DemoTag } from "@/components/ui/primitives";
import { cx } from "@/lib/format";
import { GEMINI_MODEL, cleanKey, consumeKeyFromHash, firebaseStatus, getDirectKey, hasSavedKey, looksLikeKey, saveDirectKey, subscribeDirectKey, type FirebaseStatus } from "@/lib/firebase/client";
import { supabaseConfigured } from "@/lib/supabase/client";
import { buildScanRecord, fallbackDescription } from "@/lib/scan/build-record";
import { ERROR_MESSAGE, ScanError, toScanError } from "@/lib/scan/errors";
import {
  MAX_ATTEMPTS,
  acceptUnreviewed,
  acceptedImages,
  addManualStep,
  applyShot,
  createFlow,
  currentStepIndex,
  decideFromReview,
  forceAccept,
  isCaptureDone,
  reopenStep,
  skipStep,
  type FlowState,
  type FlowStep,
} from "@/lib/scan/flow";
import { GeminiImageReviewer } from "@/lib/scan/gemini-reviewer";
import { applySimilarity, buildCandidates, summarizeMatch, type Candidate } from "@/lib/scan/match";
import { normalizeCode } from "@/lib/scan/sanitize";
import { TARGET_LABEL, type GarmentAnalysis } from "@/lib/scan/schemas";
import { newId, type ScanImageMeta, type ScanSession } from "@/lib/scan/session";
import { getBlob, listSessions, saveBlob, saveSession } from "@/lib/scan/session-store";
import { fetchImageBlob, findProductsByCode, getMarketListings, productImageUrl, searchProductsByKeywords, type DbProduct } from "@/services/product-db";
import { uploadSession } from "@/services/scan-upload";
import type { DescriptionLine, StoryBlock } from "@/types/archive-record";
import { CameraCapture, type Captured } from "./CameraCapture";
import { CandidatePicker } from "./CandidatePicker";
import { ScanAnalyzing } from "./ScanAnalyzing";
import { ScanReview, useBlobUrls } from "./ScanReview";
import { BASE_SHORT, ScanProgress, StepCards } from "./ScanSidebar";

/**
 * 실제 스캔 흐름.
 * 카메라(CameraCapture) ↔ 단계 상태 머신(lib/scan/flow) ↔ AI(ShotReviewer) ↔ 상품 DB(services/product-db) 를 잇는다.
 * Mock Data 는 참조하지 않는다. 결과는 /archive/scan/?session=… 의 상세 페이지로 넘어간다.
 */

/** review: 촬영 결과 확인 (Figma 03) · analyzing/finalizing: 분석 중 (Figma 04) */
type Phase = "intro" | "capture" | "review" | "analyzing" | "select" | "finalizing";

/** 촬영 직후 안내 — saved: 저장 완료 후 잠시 뒤 자동 이동 · detected: AI가 추가 부위를 요청 (버튼으로 이어서 촬영) */
type Notice = { kind: "saved"; stepId: string } | { kind: "detected"; stepId: string; extraIds: string[] };

/** 저장 완료 안내를 보여 주는 시간 */
const SAVED_MS = 1800;
const DAMAGE_WORDS = /손상|구멍|찢|마모|해짐|얼룩|오염|변색|보풀|올 ?풀|뜯/;

/** 한국어 조사 — 마지막 글자에 받침이 있으면 a, 없으면 b ('으로/로'는 ㄹ 받침이면 '로') */
function josa(word: string, a: string, b: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return b;
  const jong = code % 28;
  if (a === "으로") return jong === 0 || jong === 8 ? b : a;
  return jong === 0 ? b : a;
}

function newSession(model: string, storage: boolean): ScanSession {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    consent: { analysis: true, storage, at: now },
    model,
    flow: createFlow(),
    images: [],
    analysis: null,
    match: null,
    product: null,
    record: null,
    remote: null,
  };
}

const stepLabel = (s: FlowStep) => (s.kind === "base" ? BASE_SHORT[s.target] ?? s.title : s.manual ? "손상 부위" : TARGET_LABEL[s.target]);

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
  // 링크(#gemini-key=…)로 들어오면 키를 저장한다 — 저장 이벤트로 위의 구독이 "준비됨"으로 갱신한다
  useEffect(() => {
    consumeKeyFromHash();
  }, []);
  const submitKey = (value: string) => {
    const v = cleanKey(value);
    if (v && !looksLikeKey(v)) {
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

  // 스캔 페이지에 들어오면 바로 촬영을 시작한다 (Figma 02 자동 스캔). AI 키가 없을 때만 시작 화면(키 입력)을 보여 준다
  const [phase, setPhase] = useState<Phase>("capture");
  const [consentAnalysis, setConsentAnalysis] = useState(false);
  const [consentStorage, setConsentStorage] = useState(false);
  const [session, setSession] = useState<ScanSession | null>(() => newSession(reviewer.model, false));
  /** 미리보기에 멈춰 보여 줄 방금 찍은 사진 (확인 중 · 안내 · 재촬영 대기) */
  const [shot, setShot] = useState<Captured | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** 재촬영 판정 후 '다시 스캔하기'를 누를 때까지 자동 촬영을 멈춘다 */
  const [retakeHold, setRetakeHold] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [stepError, setStepError] = useState<ScanError | null>(null);
  const [phaseError, setPhaseError] = useState<{ message: string; retry: () => void } | null>(null);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recent, setRecent] = useState<ScanSession[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  /** AI 확인을 기다리는 사진 — AI 오류 때 같은 사진으로 다시 시도할 수 있게 남겨 둔다 */
  const pendingRef = useRef<{ c: Captured; imageId: string } | null>(null);
  const savedTimerRef = useRef<number | null>(null);
  const analysisRef = useRef<GarmentAnalysis | null>(null);
  const sessionRef = useRef<ScanSession | null>(session);

  useEffect(() => {
    listSessions().then(setRecent).catch(() => setRecent([]));
    return () => {
      abortRef.current?.abort();
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
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
    commit(newSession(reviewer.model, consentStorage && dbReady));
    setPhase("capture");
    window.scrollTo({ top: 0 });
  };

  const flow = session?.flow;
  const idx = flow ? currentStepIndex(flow) : -1;
  const step = flow && idx >= 0 ? flow.steps[idx] : null;

  /* ───── 촬영 ───── */
  const replaceShot = (c: Captured | null) => {
    setShot((prev) => {
      if (prev && prev.url !== c?.url) URL.revokeObjectURL(prev.url);
      return c;
    });
  };

  const clearTimer = () => {
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = null;
  };

  /** 안내를 닫고 다음 촬영으로 — 모든 단계가 끝났으면 최종 분석을 시작한다 */
  const advance = () => {
    clearTimer();
    setNotice(null);
    setRetakeHold(false);
    replaceShot(null);
    const s = sessionRef.current;
    if (s && isCaptureDone(s.flow)) toReview();
  };

  /** 단계가 통과되면 — 추가 부위 요청이 새로 생겼으면 안내 후 대기, 아니면 저장 완료를 잠시 보여 주고 넘어간다 */
  const afterAccepted = (stepId: string, imageId: string, nextFlow: FlowState) => {
    const extras = nextFlow.steps.filter((x) => x.kind === "extra" && x.requestedBy === imageId && x.status === "pending");
    if (extras.length) {
      setNotice({ kind: "detected", stepId, extraIds: extras.map((x) => x.id) });
      return;
    }
    setNotice({ kind: "saved", stepId });
    clearTimer();
    savedTimerRef.current = window.setTimeout(advance, SAVED_MS);
  };

  const commitFlow = (s: ScanSession, nextFlow: FlowState, images: ScanImageMeta[]) => {
    const next = { ...s, flow: nextFlow, images };
    commit(next);
    return next;
  };

  const onCaptured = (c: Captured) => {
    setStepError(null);
    replaceShot(c);
    pendingRef.current = { c, imageId: newId() };
    void confirmShot();
  };

  const confirmShot = async () => {
    const s = sessionRef.current;
    const p = pendingRef.current;
    if (!s || !p) return;
    const cur = s.flow.steps[currentStepIndex(s.flow)];
    if (!cur) return;
    const { c, imageId } = p;
    const q = c.quality;
    await saveBlob(imageId, c.blob);

    const meta: ScanImageMeta = {
      id: imageId,
      stepId: cur.id,
      target: cur.target,
      createdAt: new Date().toISOString(),
      width: c.width,
      height: c.height,
      blurScore: q.blurScore,
      brightness: q.brightness,
      source: c.source,
      review: null,
      decision: "pending",
      qualityOverride: q.blurry || q.dark,
    };
    const images = [...s.images.filter((i) => i.id !== imageId), meta];

    setReviewing(true);
    setStepError(null);
    try {
      const review = await reviewer.reviewShot({ imageId, blob: c.blob, target: cur.target, attempt: cur.attempts + 1 }, signal());
      const decision = decideFromReview(cur.target, review);
      const nextImages = images.map((i) => (i.id === imageId ? { ...i, review, decision: decision.kind } : i));
      pendingRef.current = null;
      const nextFlow = applyShot(s.flow, cur.id, imageId, decision, review);
      const next = commitFlow(s, nextFlow, nextImages);
      const after = nextFlow.steps.find((x) => x.id === cur.id);
      if (after?.status === "accepted") afterAccepted(cur.id, imageId, nextFlow);
      else if (after?.status === "pending") setRetakeHold(true);
      else {
        // 재촬영 한도를 넘어 '확인되지 않음'으로 넘어간 경우
        replaceShot(null);
        if (isCaptureDone(next.flow)) toReview();
      }
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
    const p = pendingRef.current;
    if (!s || !step || !p) return;
    const images = s.images.map((i) => (i.id === p.imageId ? { ...i, decision: "unreviewed" as const } : i));
    pendingRef.current = null;
    setStepError(null);
    const nextFlow = acceptUnreviewed(s.flow, step.id, p.imageId);
    commitFlow(s, nextFlow, images);
    afterAccepted(step.id, p.imageId, nextFlow);
  };

  /** 재촬영 · AI 오류 후 — 같은 단계를 다시 자동 촬영 */
  const rescan = () => {
    pendingRef.current = null;
    setStepError(null);
    setRetakeHold(false);
    replaceShot(null);
  };

  const skip = () => {
    const s = sessionRef.current;
    if (!s || !step) return;
    rescan();
    const next = commitFlow(s, skipStep(s.flow, step.id), s.images);
    if (isCaptureDone(next.flow)) toReview();
  };

  /* ───── 촬영 결과 확인 (Figma 03) ───── */
  const toReview = () => {
    setPhase("review");
    window.scrollTo({ top: 0 });
  };

  /** 확인 화면에서 한 부위만 다시 촬영 → 끝나면 다시 확인 화면으로 돌아온다 */
  const retakeStep = (stepId: string) => {
    const s = sessionRef.current;
    if (!s) return;
    rescan();
    commitFlow(s, reopenStep(s.flow, stepId), s.images);
    setPhase("capture");
    window.scrollTo({ top: 0 });
  };

  const addDamage = () => {
    const s = sessionRef.current;
    if (!s) return;
    rescan();
    commitFlow(s, addManualStep(s.flow), s.images);
    setPhase("capture");
    window.scrollTo({ top: 0 });
  };

  /** 분석 취소 → 확인 화면으로 */
  const cancelAnalysis = () => {
    abortRef.current?.abort();
    setPhaseError(null);
    toReview();
  };

  const useLastPhoto = () => {
    const s = sessionRef.current;
    if (!s || !step) return;
    const nextFlow = forceAccept(s.flow, step.id);
    const imageId = nextFlow.steps.find((x) => x.id === step.id)?.acceptedImageId;
    commitFlow(s, nextFlow, s.images);
    setRetakeHold(false);
    if (imageId) afterAccepted(step.id, imageId, nextFlow);
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
    clearTimer();
    rescan();
    setNotice(null);
    setReviewing(false);
    setSession(null);
    sessionRef.current = null;
    setPhase("intro");
    setStepError(null);
    setPhaseError(null);
  };

  /** 처음부터 다시 촬영 */
  const restart = () => {
    cancel();
    start();
  };

  /** 스캔 종료 — 홈으로 */
  const endScan = () => {
    cancel();
    router.push("/");
  };

  /* ───── 화면 ───── */
  const exhaustedRequired = step?.required && step.attempts >= MAX_ATTEMPTS && step.imageIds.length > 0;
  // AI 키가 없으면 촬영 대신 시작 화면(키 입력 · 동의)을 보여 준다
  const needKey = fbState !== null && !fb.configured;
  const showIntro = phase === "intro" || (phase === "capture" && needKey);
  const view = flow && phase === "capture" && !needKey ? captureView(flow, step, notice, retakeHold && !stepError) : null;
  const frontImageId = flow?.steps.find((x) => x.target === "front_full")?.acceptedImageId ?? null;
  const frontUrl = useBlobUrls(frontImageId && phase !== "capture" && phase !== "intro" ? [frontImageId] : [])[frontImageId ?? ""] ?? null;
  // 03 확인 · 04 분석 화면은 Figma 의 'SCAN' 머리말과 번호형 진행 막대를 쓴다
  const staged = phase === "review" || phase === "analyzing" || phase === "finalizing";

  if (staged && flow) {
    return (
      <div className="container-page flex flex-col pb-16 pt-8 md:pb-24 md:pt-[59px]">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-brand">Scan</p>
          <DemoTag>DEMO · 정품 인증 아님</DemoTag>
        </div>
        <ScanProgress active={phase === "review" ? 0 : 1} variant="numbered" className={phase === "review" ? "mt-8 md:mt-[50px]" : "mt-8 md:mt-[34px]"} />
        <div className={phase === "review" ? "mt-10 md:mt-[60px]" : "mt-10 md:mt-[38px]"}>
          {phase === "review" ? (
            <ScanReview flow={flow} onRetake={retakeStep} onAddDamage={addDamage} onStart={() => sessionRef.current && void runAnalysis(sessionRef.current)} />
          ) : (
            <ScanAnalyzing photoUrl={frontUrl} progress={progress} error={phaseError} onCancel={cancelAnalysis} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex flex-col gap-6 pb-6 pt-8 md:pt-12">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-brand">SCAN · 자동 사진 등록</p>
        {phase === "select" && (
          <button type="button" onClick={restart} className="-mr-2 h-11 px-2 text-[13px] font-semibold text-sub hover:text-ink">
            처음으로
          </button>
        )}
      </div>

      {!showIntro && <ScanProgress active={phase === "capture" ? 0 : 1} />}

      {showIntro && (
        <section className="animate-page max-w-[760px] pt-2">
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

      {phase === "capture" && flow && view && (
        <section className="animate-page flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:gap-6">
            <h1 className="text-[28px] font-bold leading-[1.35] text-[#171717] md:text-[36px]">{view.title}</h1>
            <p className="text-[15px] leading-[1.45] text-[#777] md:text-[16px]">{view.sub}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,760px)_310px]">
            <CameraCapture
              target={view.step.target}
              armed={!notice && !retakeHold && !stepError && !!step}
              frozenUrl={shot?.url ?? null}
              tone={view.tone === "error" ? "error" : "normal"}
              busy={reviewing}
              onCaptured={onCaptured}
              badge={
                view.badge && (
                  <div className="flex flex-col rounded-[8px] border border-brand bg-white px-3 pb-2 pt-[9px] leading-[1.45]">
                    <span className="text-[14px] font-bold text-brand">{view.badge.title}</span>
                    <span className="text-[11px] text-[#777]">{view.badge.sub}</span>
                  </div>
                )
              }
            >
              <div
                className={cx(
                  "flex min-h-12 items-center justify-center px-4 py-2 text-center text-[15px] font-bold leading-[1.45]",
                  view.tone === "error" ? "bg-[#fff0f0] text-brand" : "bg-[#f5f5f5]",
                  view.tone === "success" ? "text-[#32804a]" : view.tone === "normal" && "text-[#171717]",
                )}
                role="status"
                aria-live="polite"
              >
                {reviewing ? `${view.label}${josa(view.label, "을", "를")} 확인하고 있어요` : view.status}
              </div>
              <p className="text-[12px] leading-[1.45] text-[#8a8a8a]">AI는 촬영 상태를 확인하며, 정품 인증은 별도 검수로 진행돼요.</p>

              {stepError && (
                <div className="border border-brand p-4" role="alert">
                  <p className="flex items-center gap-2 text-[14px] font-bold text-brand">
                    <AlertTriangle size={16} /> AI 확인 실패
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed">{stepError.message}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => void confirmShot()} className="inline-flex h-11 items-center justify-center gap-1.5 bg-ink text-[13px] font-bold text-white">
                      <RotateCcw size={15} /> 다시 시도
                    </button>
                    <button type="button" onClick={continueWithoutReview} className="h-11 border border-ink text-[13px] font-bold">
                      AI 검토 없이 계속
                    </button>
                    <button type="button" onClick={rescan} className="h-11 border border-line text-[13px] font-bold">
                      다시 촬영
                    </button>
                  </div>
                </div>
              )}
            </CameraCapture>

            <aside className="flex flex-col gap-4">
              <h2 className="text-[18px] font-bold leading-[1.45] text-[#171717]">촬영 진행</h2>
              <StepCards steps={flow.steps} focusId={view.step.id} retakeId={view.kind === "retake" ? view.step.id : null} />
              <h3 className="text-[15px] font-bold leading-[1.45] text-[#171717]">촬영 가이드</h3>
              <p className="text-[13px] leading-[1.45] text-[#777]">{view.guide}</p>
              <p className="text-[12px] leading-[1.45] text-[#8a8a8a]">{view.note}</p>

              {view.kind === "retake" ? (
                <button type="button" onClick={rescan} className="h-[52px] bg-brand px-6 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark">
                  다시 스캔하기
                </button>
              ) : view.kind === "detected" ? (
                <button type="button" onClick={advance} className="h-[52px] bg-brand px-6 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark">
                  {view.action}
                </button>
              ) : (
                <button type="button" onClick={endScan} className="h-[52px] border border-[#d6d6d6] bg-white px-6 text-[16px] font-medium text-[#222] transition-colors hover:border-ink">
                  스캔 종료
                </button>
              )}

              {view.extras.length > 0 && (
                <ul className="flex flex-col gap-1 text-[13px] leading-[1.35] text-brand">
                  {view.extras.map((x) => (
                    <li key={x.key}>
                      {x.head}
                      <br />
                      {x.tail}
                    </li>
                  ))}
                </ul>
              )}

              {view.kind === "retake" && step && (
                <div className="flex flex-col items-start gap-1 text-[12px] text-sub">
                  <p>
                    촬영 {step.attempts}/{MAX_ATTEMPTS}회 · 한도를 넘으면 이 부위는 &lsquo;확인되지 않음&rsquo;으로 기록돼요.
                  </p>
                  {exhaustedRequired && (
                    <button type="button" onClick={useLastPhoto} className="h-9 font-bold text-brand">
                      마지막 사진 그대로 사용
                    </button>
                  )}
                </div>
              )}
              {step && !step.required && !notice && (
                <button type="button" onClick={skip} className="self-start text-[12px] font-semibold text-sub underline-offset-4 hover:text-ink hover:underline">
                  이 부위 건너뛰기 (확인되지 않음으로 기록)
                </button>
              )}
            </aside>
          </div>
        </section>
      )}

      {phase === "select" && session?.analysis && (
        <div className="max-w-[760px]">
          <CandidatePicker candidates={candidates} recognizedCode={normalizeCode(session.analysis.care_label.product_code.value)} onChoose={choose} />
        </div>
      )}
    </div>
  );
}

/* ───── 촬영 화면 문구 (Figma 02 자동 스캔) ───── */

interface CaptureView {
  kind: "scanning" | "saved" | "detected" | "retake";
  step: FlowStep;
  label: string;
  title: string;
  sub: string;
  status: string;
  tone: "normal" | "success" | "error";
  guide: string;
  note: string;
  action?: string;
  badge?: { title: string; sub: string };
  extras: { key: string; head: string; tail: string }[];
}

const NOTE_BASE = "잘 촬영되면 다음 단계로 자동 이동해요. 촬영이 어려우면 해당 단계만 다시 시도해요.";
const NOTE_EXTRA = "추가 부위는 따로 저장해요. 여러 부위는 차례대로 스캔한 후 다음 기본 단계로 이동해요.";

function savedPrefix(flow: FlowState, exceptId: string) {
  const saved = flow.steps.filter((s) => s.kind === "base" && s.status === "accepted" && s.id !== exceptId).map(stepLabel);
  return saved.length ? `${saved.join("·")} 사진은 저장했어요. ` : "";
}

/** 추가 부위 안내 줄 — '추가 부위 1 / 2 · 오른쪽 소매' / '구멍 의심 · 확대 스캔' */
function extraLines(flow: FlowState, requestedBy: string | undefined, savedId?: string) {
  if (!requestedBy) return [];
  const group = flow.steps.filter((s) => s.kind === "extra" && s.requestedBy === requestedBy);
  return group.map((s, i) => ({
    key: s.id,
    head: `추가 부위 ${i + 1} / ${group.length} · ${TARGET_LABEL[s.target]}`,
    tail: s.status === "accepted" || s.id === savedId ? "저장 완료" : `${s.reason ?? "추가 확인"} · 확대 스캔`,
  }));
}

function captureView(flow: FlowState, step: FlowStep | null, notice: Notice | null, retake: boolean): CaptureView | null {
  const noticeStep = notice ? flow.steps.find((s) => s.id === notice.stepId) ?? null : null;
  const cur = noticeStep ?? step;
  if (!cur) return null;
  const label = stepLabel(cur);
  const extra = cur.kind === "extra";
  const nextIdx = currentStepIndex(flow);
  const next = nextIdx >= 0 ? flow.steps[nextIdx] : null;

  // 저장 완료 → 잠시 뒤 자동 이동
  if (notice?.kind === "saved") {
    const nextLabel = next ? stepLabel(next) : null;
    return {
      kind: "saved",
      step: cur,
      label,
      title: extra ? "추가 부위 촬영이 완료됐어요" : `${label} 촬영이 완료됐어요`,
      sub: extra
        ? `추가 부위 사진을 저장했어요. 잠시 후 ${nextLabel ? `${nextLabel} 촬영으로` : "AI 분석으로"} 이어져요.`
        : `사진 상태를 확인했어요. 잠시 후 ${nextLabel ? `${nextLabel} 스캔으로 자동 이동해요.` : "AI 분석을 시작해요."}`,
      status: `${label} 확인 완료 · ${nextLabel ? `${nextLabel}${josa(nextLabel, "으로", "로")}` : "AI 분석으로"} 이동 중`,
      tone: "success",
      guide: !next
        ? "촬영한 사진으로 AI 분석을 시작해요."
        : next.target === "back_full"
          ? "옷을 뒤집을 준비를 해주세요."
          : next.target === "care_label"
            ? "옆구리 안쪽의 케어라벨을 찾아 펼쳐 주세요."
            : `${TARGET_LABEL[next.target]}${josa(TARGET_LABEL[next.target], "을", "를")} 가까이 보여줄 준비를 해주세요.`,
      note: extra ? NOTE_EXTRA : NOTE_BASE,
      extras: extra ? extraLines(flow, cur.requestedBy, cur.id) : [],
    };
  }

  // AI가 추가 부위를 요청 → 안내 후 버튼으로 이어서 촬영
  if (notice?.kind === "detected") {
    const extras = notice.extraIds.map((id) => flow.steps.find((s) => s.id === id)).filter((s): s is FlowStep => !!s);
    const first = extras[0];
    const damage = extras.some((s) => DAMAGE_WORDS.test(`${s.reason ?? ""} ${s.guide}`));
    const firstLabel = first ? TARGET_LABEL[first.target] : "추가 부위";
    const kindLabel = damage ? "손상 부위" : "추가 부위";
    return {
      kind: "detected",
      step: cur,
      label,
      title: damage ? "손상이 의심되는 부위를 찾았어요" : "추가로 확인할 부위를 찾았어요",
      sub: `${label} 사진은 저장했어요. ${firstLabel}${josa(firstLabel, "을", "를")} 추가로 촬영해 주세요.`,
      status: `${label} 저장 완료 · ${kindLabel} 추가 스캔 필요`,
      tone: "error",
      guide: first?.guide ?? "주변 원단까지 보이도록 펼쳐 가까이 보여주세요.",
      note: NOTE_EXTRA,
      action: `${kindLabel} 스캔하기`,
      badge: first ? { title: damage ? "손상 의심" : "추가 확인", sub: `${firstLabel} · ${first.reason ?? "가까이 확인"}` } : undefined,
      extras: extraLines(flow, first?.requestedBy),
    };
  }

  const others = savedPrefix(flow, cur.id);

  // 재촬영 판정 → '다시 스캔하기'를 누를 때까지 대기
  if (retake && cur.message) {
    const isLabel = cur.target === "care_label" || cur.target === "main_tag";
    return {
      kind: "retake",
      step: cur,
      label,
      title: isLabel ? "라벨 글자가 흐리게 보여요" : `${label}${josa(label, "을", "를")} 다시 보여주세요`,
      sub: `${others}${cur.message}`,
      status: isLabel ? "초점과 밝기를 확인해 주세요" : "다시 촬영해 주세요",
      tone: "error",
      guide: isLabel
        ? "라벨을 펼치고 카메라를 고정해 글자가 선명해지도록 해주세요."
        : extra
          ? cur.guide
          : "양쪽 소매와 밑단이 잘리지 않도록 평평하게 펼쳐 주세요.",
      note: extra ? NOTE_EXTRA : NOTE_BASE,
      extras: extra ? extraLines(flow, cur.requestedBy) : [],
    };
  }

  // 촬영 중 (자동 촬영 대기)
  const base = { kind: "scanning" as const, step: cur, label, tone: "normal" as const };
  if (extra) {
    const lines = extraLines(flow, cur.requestedBy);
    const pos = lines.findIndex((l) => l.key === cur.id);
    return {
      ...base,
      title: `${label}${josa(label, "을", "를")} 가까이 보여주세요`,
      sub: `${label}${josa(label, "과", "와")} 주변 원단이 가이드에 들어오면 자동 촬영해요.`,
      status: `추가 부위 ${pos + 1} / ${lines.length} · ${label} 확인 중`,
      guide: cur.guide,
      note: NOTE_EXTRA,
      extras: lines,
    };
  }
  if (cur.target === "back_full") {
    return {
      ...base,
      title: "옷을 뒤집어 뒷면을 보여주세요",
      sub: `${others}뒷면과 양쪽 소매가 모두 보이도록 펼쳐 주세요.`,
      status: "뒷면을 확인하고 있어요",
      guide: "뒷면 전체가 보이면 자동으로 촬영해요.",
      note: NOTE_BASE,
      extras: [],
    };
  }
  if (cur.target === "care_label") {
    return {
      ...base,
      title: "케어라벨을 가까이 보여주세요",
      sub: `${others}라벨을 펼치고 글자가 선명하게 보이도록 화면에 맞춰 주세요.`,
      status: "케어라벨 글자를 확인하고 있어요",
      guide: "초점이 맞고 글자가 확인되면 자동으로 촬영해요.",
      note: NOTE_BASE,
      extras: [],
    };
  }
  return {
    ...base,
    title: "옷의 앞면을 펼쳐 주세요",
    sub: "옷 전체와 양쪽 소매가 프레임 안에 들어오면 자동으로 촬영해요.",
    status: "앞면을 확인하고 있어요",
    guide: "밝은 곳에서 옷을 평평하게 펼쳐 주세요.",
    note: NOTE_BASE,
    extras: [],
  };
}
