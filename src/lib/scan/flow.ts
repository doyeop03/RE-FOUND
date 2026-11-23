import { TARGET_LABEL, type ShotReview, type Target } from "./schemas";
import type { ImageQuality } from "./image";

/**
 * 촬영 단계 상태 머신 (순수 함수 · tests/flow.test.ts).
 *
 * STEP 1 앞면 → STEP 2 뒷면 → STEP 3 케어라벨 → STEP 4 AI가 요청한 추가 부위 → STEP 5 최종 분석
 *
 * - 사진마다 결정(accept / retake)을 받아 다음 단계로 가거나 같은 단계에 머문다.
 * - 한 단계의 촬영은 최대 MAX_ATTEMPTS 번. 넘으면 '확인되지 않음(unverified)'으로 두고 넘어간다.
 * - AI 가 요청한 추가 부위는 중복 없이, 세션 전체에서 MAX_EXTRA_STEPS 개까지만 끼워 넣는다.
 *   추가 단계에서 다시 요청이 나와도 이 한도를 넘지 않으므로 무한 반복되지 않는다.
 */

export const MAX_ATTEMPTS = 3;
export const MAX_EXTRA_STEPS = 4;

export type StepStatus = "pending" | "accepted" | "unverified";

export interface FlowStep {
  id: string;
  target: Target;
  kind: "base" | "extra";
  title: string;
  guide: string;
  /** 건너뛸 수 없는 단계 (앞면) */
  required: boolean;
  attempts: number;
  status: StepStatus;
  /** 재촬영 안내 등 현재 사용자에게 보여 줄 메시지 */
  message: string | null;
  imageIds: string[];
  acceptedImageId: string | null;
  /** AI 검토 없이 통과한 경우 (AI 오류 후 사용자가 계속 진행을 고른 경우) */
  reviewed: boolean;
  requestedBy?: string;
  reason?: string;
}

export interface FlowState {
  steps: FlowStep[];
  extrasAdded: number;
}

const BASE: Pick<FlowStep, "target" | "title" | "guide" | "required">[] = [
  { target: "front_full", title: "의류 앞면", guide: "옷을 평평하게 펼치고 전체가 가이드 안에 들어오게 촬영해 주세요.", required: true },
  { target: "back_full", title: "의류 뒷면", guide: "옷을 뒤집어 뒷면 전체가 보이게 촬영해 주세요.", required: false },
  { target: "care_label", title: "케어라벨", guide: "옆구리 안쪽의 케어라벨을 글자가 읽히도록 가까이 촬영해 주세요.", required: false },
];

export function createFlow(): FlowState {
  return {
    extrasAdded: 0,
    steps: BASE.map((b, i) => ({
      ...b,
      id: `base-${i + 1}`,
      kind: "base",
      attempts: 0,
      status: "pending",
      message: null,
      imageIds: [],
      acceptedImageId: null,
      reviewed: false,
    })),
  };
}

export function currentStepIndex(state: FlowState) {
  return state.steps.findIndex((s) => s.status === "pending");
}

export function isCaptureDone(state: FlowState) {
  return currentStepIndex(state) === -1;
}

export type Decision = { kind: "accept" } | { kind: "retake"; message: string };

const FULL_VIEWS: Target[] = ["front_full", "back_full"];

/** 기기 판정 → 즉시 재촬영 안내 (AI 호출 전) */
export function decideFromQuality(q: ImageQuality): Decision {
  if (q.blurry) return { kind: "retake", message: "사진이 흐립니다. 휴대폰을 고정하고 초점을 맞춘 뒤 다시 촬영해 주세요." };
  if (q.dark) return { kind: "retake", message: "사진이 너무 어둡습니다. 밝은 곳에서 다시 촬영해 주세요." };
  return { kind: "accept" };
}

/** AI 검토 결과 → 결정 */
export function decideFromReview(target: Target, r: ShotReview): Decision {
  const fallback = FULL_VIEWS.includes(target)
    ? `${TARGET_LABEL[target]}가 잘 보이지 않습니다. 옷을 펼쳐 전체가 들어오게 다시 촬영해 주세요.`
    : `${TARGET_LABEL[target]} 부분이 잘 보이지 않습니다. 조금 더 가까이 다시 촬영해 주세요.`;

  if (!r.is_garment) return { kind: "retake", message: "옷이 인식되지 않습니다. 옷만 보이도록 다시 촬영해 주세요." };
  if (r.retake_needed || !r.matches_expected_view || r.sharpness === "blurry") {
    return { kind: "retake", message: r.retake_instruction_ko || fallback };
  }
  if (FULL_VIEWS.includes(target) && (r.framing === "partial" || r.framing === "too_close")) {
    return { kind: "retake", message: r.retake_instruction_ko || fallback };
  }
  if (target === "care_label") {
    const leg = r.label_reading?.product_code_legibility;
    if (!r.label_reading || leg === "partial" || leg === "illegible") {
      return { kind: "retake", message: r.retake_instruction_ko || "케어라벨의 제품번호가 흐릿합니다. 조금 더 가까이 촬영해주세요." };
    }
  }
  return { kind: "accept" };
}

function patch(state: FlowState, stepId: string, fn: (s: FlowStep) => FlowStep): FlowState {
  return { ...state, steps: state.steps.map((s) => (s.id === stepId ? fn(s) : s)) };
}

/** 사진 1장의 결과를 반영한다 */
export function applyShot(
  state: FlowState,
  stepId: string,
  imageId: string,
  decision: Decision,
  review: ShotReview | null,
): FlowState {
  const step = state.steps.find((s) => s.id === stepId);
  if (!step || step.status !== "pending") return state;
  const attempts = step.attempts + 1;

  if (decision.kind === "retake") {
    const exhausted = attempts >= MAX_ATTEMPTS;
    return patch(state, stepId, (s) => ({
      ...s,
      attempts,
      imageIds: [...s.imageIds, imageId],
      status: exhausted && !s.required ? "unverified" : "pending",
      message: exhausted
        ? s.required
          ? "앞면 사진은 꼭 필요합니다. 마지막 사진을 그대로 쓰거나 갤러리에서 선택해 주세요."
          : "재촬영 횟수를 넘어 이 부위는 '확인되지 않음'으로 기록합니다."
        : decision.message,
      reason: exhausted ? decision.message : s.reason,
    }));
  }

  let next = patch(state, stepId, (s) => ({
    ...s,
    attempts,
    imageIds: [...s.imageIds, imageId],
    status: "accepted",
    acceptedImageId: imageId,
    reviewed: review !== null,
    message: null,
  }));
  if (review) next = addRequestedSteps(next, review, imageId);
  return next;
}

/** 앞면처럼 필수인 단계에서 재촬영 한도를 넘었을 때 — 마지막 사진을 그대로 쓴다 (AI 판정은 그대로 기록) */
export function forceAccept(state: FlowState, stepId: string): FlowState {
  return patch(state, stepId, (s) =>
    s.imageIds.length
      ? { ...s, status: "accepted", acceptedImageId: s.imageIds[s.imageIds.length - 1], message: null, reason: s.reason ?? "재촬영 한도 초과 후 사용" }
      : s,
  );
}

/** AI 검토 없이 통과 (AI 오류 → 사용자가 '검토 없이 계속'을 선택) */
export function acceptUnreviewed(state: FlowState, stepId: string, imageId: string): FlowState {
  return patch(state, stepId, (s) => ({
    ...s,
    attempts: s.attempts + 1,
    imageIds: [...s.imageIds, imageId],
    status: "accepted",
    acceptedImageId: imageId,
    reviewed: false,
    message: null,
    reason: "AI 검토를 받지 못한 사진",
  }));
}

export function skipStep(state: FlowState, stepId: string, reason = "사용자가 촬영을 건너뛰어 확인되지 않음"): FlowState {
  return patch(state, stepId, (s) => (s.required ? s : { ...s, status: "unverified", message: null, reason }));
}

export function addRequestedSteps(state: FlowState, review: ShotReview, imageId: string): FlowState {
  let { extrasAdded } = state;
  const steps = [...state.steps];
  const existing = new Set(steps.filter((s) => s.status !== "unverified" || s.kind === "extra").map((s) => s.target));
  const extras: FlowStep[] = [];

  for (const req of review.detail_requests) {
    if (extrasAdded >= MAX_EXTRA_STEPS) break;
    if (existing.has(req.target)) continue;
    existing.add(req.target);
    extrasAdded += 1;
    extras.push({
      id: `extra-${extrasAdded}`,
      target: req.target,
      kind: "extra",
      title: `${TARGET_LABEL[req.target]} 추가 촬영`,
      guide: req.instruction_ko,
      required: false,
      attempts: 0,
      status: "pending",
      message: req.reason_ko,
      imageIds: [],
      acceptedImageId: null,
      reviewed: false,
      requestedBy: imageId,
      reason: req.reason_ko,
    });
  }
  if (!extras.length) return state;

  // 기본 단계(앞 · 뒤 · 라벨)는 처음부터 앞에 있으므로, 뒤에 붙이면 항상 기본 단계가 끝난 다음 차례가 된다
  return { steps: [...steps, ...extras], extrasAdded };
}

export function acceptedImages(state: FlowState) {
  return state.steps.filter((s) => s.acceptedImageId).map((s) => ({ stepId: s.id, target: s.target, imageId: s.acceptedImageId as string, reviewed: s.reviewed }));
}
