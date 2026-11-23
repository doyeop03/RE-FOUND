import { describe, expect, it } from "vitest";
import { codeAppearsInText, guardDescription, guardStory, normalizeCode, sanitizeAnalysis, sanitizeShotReview } from "@/lib/scan/sanitize";
import { analysisFixture, reviewFixture } from "./fixtures";

describe("품번 가드", () => {
  it("정규화", () => {
    expect(normalizeCode("341-123456")).toBe("341123456");
    expect(normalizeCode("ab")).toBeNull();
  });
  it("라벨 원문에 없는 품번은 버린다", () => {
    expect(codeAppearsInText("123456", "商品番号 123456 POLYESTER 100%")).toBe(true);
    expect(codeAppearsInText("123457", "商品番号 123456")).toBe(false);
  });
  it("사진 검토: 판독이 clear 가 아니면 품번을 비운다", () => {
    const r = sanitizeShotReview(reviewFixture({ label_reading: { product_code: "12345", product_code_legibility: "partial", visible_text: "12345" } }));
    expect(r.label_reading?.product_code).toBeNull();
  });
  it("사진 1장당 추가 촬영 요청은 2개까지", () => {
    const req = { target: "zipper" as const, reason_ko: "r", instruction_ko: "i" };
    const r = sanitizeShotReview(reviewFixture({ detail_requests: [req, { ...req, target: "hem" }, { ...req, target: "collar" }] }));
    expect(r.detail_requests).toHaveLength(2);
  });
});

describe("최종 분석 가드", () => {
  it("근거 사진 없는 의심/발견되지 않음은 unknown 으로 낮춘다", () => {
    const a = analysisFixture();
    a.condition.pilling = { status: "suspected", locations: ["소매"], evidence_image_ids: [], note_ko: null };
    a.condition.stains = { status: "not_observed", locations: [], evidence_image_ids: ["nope"], note_ko: null };
    const s = sanitizeAnalysis(a, ["img-front"]);
    expect(s.condition.pilling.status).toBe("unknown");
    expect(s.condition.stains.status).toBe("unknown");
  });
  it("라벨 원문에 없는 품번 · 없는 이미지 id 를 지운다", () => {
    const a = analysisFixture();
    a.care_label.product_code = { value: "999999", status: "observed", evidence_image_ids: ["img-label"] };
    a.garment.color = { value: "네이비", status: "observed", evidence_image_ids: ["ghost"] };
    const s = sanitizeAnalysis(a, ["img-front", "img-label"]);
    expect(s.care_label.product_code.value).toBeNull();
    expect(s.garment.color.status).toBe("unknown");
  });
});

describe("설명 · 스토리 가드", () => {
  it("사실에 없는 연도가 든 문장을 버린다", () => {
    const lines = guardDescription(
      {
        lines: [
          { text: "2017 F/W 컬렉션의 카디건입니다.", basis: "product_db", fact_keys: ["release_year"] },
          { text: "1998년 플리스 붐을 이끈 모델입니다.", basis: "product_db", fact_keys: ["release_year"] },
          { text: "사진에서 보풀은 보이지 않습니다.", basis: "ai_observation", fact_keys: [] },
          { text: "근거 없는 사실", basis: "product_db", fact_keys: ["unknown_key"] },
        ],
      },
      { release_year: 2017 },
    );
    expect(lines.map((l) => l.text)).toEqual(["2017 F/W 컬렉션의 카디건입니다.", "사진에서 보풀은 보이지 않습니다."]);
  });
  it("출처가 없거나 출처에 없는 연도를 쓴 스토리 블록을 버린다", () => {
    const blocks = guardStory(
      {
        blocks: [
          { title: "2017", body: "공식 페이지에 실렸습니다.", source_ids: ["s1"] },
          { title: "1994", body: "브랜드 첫 플리스", source_ids: ["s1"] },
          { title: "No source", body: "출처 없음", source_ids: [] },
        ],
      },
      [{ id: "s1", excerpt: "UNIQLO U Fall Winter 2017 · Fleece cardigan" }],
    );
    expect(blocks.map((b) => b.title)).toEqual(["2017"]);
  });
});
