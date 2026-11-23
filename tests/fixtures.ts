import type { GarmentAnalysis, ShotReview } from "@/lib/scan/schemas";

export function reviewFixture(over: Partial<ShotReview> = {}): ShotReview {
  return {
    is_garment: true,
    matches_expected_view: true,
    framing: "full",
    sharpness: "sharp",
    lighting: "ok",
    retake_needed: false,
    retake_instruction_ko: null,
    visible_parts: ["front_full", "collar", "left_sleeve", "right_sleeve", "zipper"],
    concerns: [],
    detail_requests: [],
    label_reading: null,
    ...over,
  };
}

const none = { status: "unknown" as const, locations: [], evidence_image_ids: [], note_ko: null };

export function analysisFixture(): GarmentAnalysis {
  return {
    garment: {
      category: { value: "플리스 집업 재킷", status: "observed", evidence_image_ids: ["img-front"] },
      color: { value: "옐로", status: "observed", evidence_image_ids: ["img-front"] },
      silhouette: { value: null, status: "unknown", evidence_image_ids: [] },
      fit: { value: null, status: "unknown", evidence_image_ids: [] },
      collar_type: { value: "스탠드 칼라", status: "observed", evidence_image_ids: ["img-front"] },
      sleeve_type: { value: "긴소매", status: "observed", evidence_image_ids: ["img-front"] },
      design_features: { value: ["풀 집업"], status: "observed", evidence_image_ids: ["img-front"] },
    },
    care_label: {
      product_code: { value: "123456", status: "observed", evidence_image_ids: ["img-label"] },
      material_composition: { value: "폴리에스터 100%", status: "observed", evidence_image_ids: ["img-label"] },
      washing_instructions: { value: ["30℃ 손세탁"], status: "observed", evidence_image_ids: ["img-label"] },
      visible_label_text: { value: "商品番号 123456 POLYESTER 100%", status: "observed", evidence_image_ids: ["img-label"] },
    },
    condition: {
      pilling: { status: "suspected", locations: ["오른쪽 소매"], evidence_image_ids: ["img-sleeve"], note_ko: "보풀로 보이는 부분" },
      stains: { status: "not_observed", locations: [], evidence_image_ids: ["img-front"], note_ko: null },
      discoloration: none,
      tears: none,
      wear: none,
      zipper_condition: { status: "not_observed", locations: [], evidence_image_ids: ["img-front"], note_ko: "외관만 확인" },
      damage_locations: [{ location: "오른쪽 소매", type: "보풀", evidence_image_ids: ["img-sleeve"] }],
      additional_photos_needed: [],
    },
    summary_ko: "노란색 플리스 집업 재킷입니다. 오른쪽 소매에 보풀이 의심됩니다.",
  };
}
