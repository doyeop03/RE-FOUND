import { describe, expect, it } from "vitest";
import {
  MAX_ATTEMPTS,
  MAX_EXTRA_STEPS,
  addManualStep,
  applyShot,
  createFlow,
  currentStepIndex,
  decideFromQuality,
  decideFromReview,
  forceAccept,
  isCaptureDone,
  reopenStep,
  skipStep,
} from "@/lib/scan/flow";
import { reviewFixture } from "./fixtures";

const accept = { kind: "accept" as const };
const retake = { kind: "retake" as const, message: "다시" };

describe("촬영 단계 상태 머신", () => {
  it("앞면 → 뒷면 → 케어라벨 순서", () => {
    const f = createFlow();
    expect(f.steps.map((s) => s.target)).toEqual(["front_full", "back_full", "care_label"]);
    expect(f.steps[0].required).toBe(true);
  });

  it("문제가 없으면 다음 단계로", () => {
    const f = applyShot(createFlow(), "base-1", "i1", accept, reviewFixture());
    expect(f.steps[0].status).toBe("accepted");
    expect(currentStepIndex(f)).toBe(1);
  });

  it("재촬영 한도를 넘으면 '확인되지 않음'으로 넘어간다", () => {
    let f = createFlow();
    f = applyShot(f, "base-1", "i1", accept, reviewFixture());
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) f = applyShot(f, "base-2", `b${i}`, retake, reviewFixture());
    expect(f.steps[1].status).toBe("unverified");
    expect(currentStepIndex(f)).toBe(2);
  });

  it("필수인 앞면은 한도를 넘어도 건너뛰지 않고, 마지막 사진을 쓸 수 있다", () => {
    let f = createFlow();
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) f = applyShot(f, "base-1", `f${i}`, retake, null);
    expect(f.steps[0].status).toBe("pending");
    expect(skipStep(f, "base-1").steps[0].status).toBe("pending");
    f = forceAccept(f, "base-1");
    expect(f.steps[0].acceptedImageId).toBe(`f${MAX_ATTEMPTS - 1}`);
  });

  it("AI 요청 부위는 중복 없이 요청한 단계 바로 뒤에 추가되고 총 개수가 제한된다", () => {
    const req = (target: "right_sleeve" | "zipper" | "hem" | "collar" | "pocket" | "shoulder") => ({ target, reason_ko: "마모 의심", instruction_ko: "가까이 촬영해주세요" });
    let f = applyShot(createFlow(), "base-1", "i1", accept, reviewFixture({ detail_requests: [req("right_sleeve"), req("zipper")] }));
    expect(f.steps.map((s) => s.target)).toEqual(["front_full", "right_sleeve", "zipper", "back_full", "care_label"]);
    expect(f.steps[currentStepIndex(f)].target).toBe("right_sleeve");
    f = applyShot(f, "extra-1", "e1", accept, reviewFixture());
    f = applyShot(f, "extra-2", "e2", accept, reviewFixture());
    f = applyShot(f, "base-2", "i2", accept, reviewFixture({ detail_requests: [req("right_sleeve"), req("hem")] }));
    f = applyShot(f, "base-3", "i3", accept, reviewFixture({ detail_requests: [req("collar"), req("pocket")] }));
    f = applyShot(f, "extra-1", "i4", accept, reviewFixture({ detail_requests: [req("shoulder")] }));
    expect(f.steps.filter((s) => s.kind === "extra")).toHaveLength(MAX_EXTRA_STEPS);
    expect(new Set(f.steps.map((s) => s.target)).size).toBe(f.steps.length);
  });

  it("모든 단계가 끝나면 최종 분석으로", () => {
    let f = createFlow();
    f = applyShot(f, "base-1", "i1", accept, reviewFixture());
    f = skipStep(f, "base-2");
    f = applyShot(f, "base-3", "i3", accept, reviewFixture());
    expect(isCaptureDone(f)).toBe(true);
  });
});

describe("촬영 결과 확인 화면", () => {
  const done = () => {
    let f = createFlow();
    for (const [id, img] of [["base-1", "i1"], ["base-2", "i2"], ["base-3", "i3"]]) f = applyShot(f, id, img, accept, null);
    return f;
  };

  it("재촬영하면 그 단계만 다시 촬영 대기가 되고, 다시 찍으면 확인 화면으로 돌아갈 수 있다", () => {
    let f = reopenStep(done(), "base-2");
    expect(currentStepIndex(f)).toBe(1);
    expect(f.steps[1].acceptedImageId).toBeNull();
    expect(f.steps[1].imageIds).toEqual(["i2"]);
    f = applyShot(f, "base-2", "i4", accept, null);
    expect(isCaptureDone(f)).toBe(true);
    expect(f.steps[1].acceptedImageId).toBe("i4");
  });

  it("손상 부위를 직접 추가하면 맨 뒤에 사용자 추가 단계가 붙는다", () => {
    const f = addManualStep(done());
    const last = f.steps.at(-1)!;
    expect(last).toMatchObject({ kind: "extra", manual: true, status: "pending" });
    expect(currentStepIndex(f)).toBe(f.steps.length - 1);
    expect(addManualStep(f).steps.at(-1)!.id).not.toBe(last.id);
  });
});

describe("재촬영 판단", () => {
  it("흐리거나 어두우면 기기에서 먼저 재촬영 유도", () => {
    expect(decideFromQuality({ blurScore: 10, brightness: 120, blurry: true, dark: false }).kind).toBe("retake");
    expect(decideFromQuality({ blurScore: 300, brightness: 120, blurry: false, dark: false }).kind).toBe("accept");
  });
  it("AI 안내 문구를 그대로 사용", () => {
    const d = decideFromReview("back_full", reviewFixture({ framing: "partial", retake_instruction_ko: "뒷면 전체가 보이지 않습니다. 옷을 펼쳐 다시 촬영해주세요." }));
    expect(d).toEqual({ kind: "retake", message: "뒷면 전체가 보이지 않습니다. 옷을 펼쳐 다시 촬영해주세요." });
  });
  it("케어라벨 품번이 흐리면 가까이 재촬영", () => {
    const d = decideFromReview("care_label", reviewFixture({ label_reading: { product_code: null, product_code_legibility: "partial", visible_text: "POLY" } }));
    expect(d.kind).toBe("retake");
    if (d.kind === "retake") expect(d.message).toContain("케어라벨");
  });
  it("옷이 아니면 재촬영", () => {
    expect(decideFromReview("front_full", reviewFixture({ is_garment: false })).kind).toBe("retake");
  });
});
