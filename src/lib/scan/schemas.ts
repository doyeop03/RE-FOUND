import { z } from "zod";

/**
 * Gemini 응답 스키마 (zod).
 * - Firebase AI Logic 에는 같은 구조의 responseSchema(gemini-schemas.ts)를 보내 구조화된 JSON을 받는다.
 * - 받은 JSON 은 여기서 다시 검증한다. 검증에 실패한 응답은 화면에 쓰지 않는다.
 */

export const TARGETS = [
  "front_full",
  "back_full",
  "care_label",
  "main_tag",
  "collar",
  "left_sleeve",
  "right_sleeve",
  "left_cuff",
  "right_cuff",
  "zipper",
  "hem",
  "pocket",
  "chest",
  "shoulder",
  "fabric_closeup",
  "other",
] as const;
export type Target = (typeof TARGETS)[number];

export const TARGET_LABEL: Record<Target, string> = {
  front_full: "앞면 전체",
  back_full: "뒷면 전체",
  care_label: "케어라벨",
  main_tag: "메인 택(목 라벨)",
  collar: "칼라 · 목 부분",
  left_sleeve: "왼쪽 소매",
  right_sleeve: "오른쪽 소매",
  left_cuff: "왼쪽 소매 끝",
  right_cuff: "오른쪽 소매 끝",
  zipper: "지퍼",
  hem: "밑단",
  pocket: "주머니",
  chest: "가슴 부분",
  shoulder: "어깨",
  fabric_closeup: "원단 클로즈업",
  other: "기타 부위",
};

export const CONCERN_TYPES = ["pilling", "stain", "discoloration", "tear", "wear", "zipper_issue", "label_unreadable", "other"] as const;

export const ShotReviewSchema = z.object({
  is_garment: z.boolean(),
  matches_expected_view: z.boolean(),
  framing: z.enum(["full", "partial", "too_close", "too_far", "unknown"]),
  sharpness: z.enum(["sharp", "slightly_blurry", "blurry"]),
  lighting: z.enum(["ok", "too_dark", "glare", "unknown"]),
  retake_needed: z.boolean(),
  retake_instruction_ko: z.string().nullable(),
  visible_parts: z.array(z.enum(TARGETS)),
  concerns: z.array(
    z.object({
      type: z.enum(CONCERN_TYPES),
      location: z.enum(TARGETS),
      confidence: z.enum(["low", "medium", "high"]),
      description_ko: z.string(),
    }),
  ),
  detail_requests: z.array(
    z.object({
      target: z.enum(TARGETS),
      reason_ko: z.string(),
      instruction_ko: z.string(),
    }),
  ),
  label_reading: z
    .object({
      product_code: z.string().nullable(),
      product_code_legibility: z.enum(["clear", "partial", "illegible", "not_present"]),
      visible_text: z.string().nullable(),
    })
    .nullable(),
});
export type ShotReview = z.infer<typeof ShotReviewSchema>;

const Observed = z.object({
  value: z.string().nullable(),
  status: z.enum(["observed", "unknown"]),
  evidence_image_ids: z.array(z.string()),
});
const ObservedList = z.object({
  value: z.array(z.string()),
  status: z.enum(["observed", "unknown"]),
  evidence_image_ids: z.array(z.string()),
});
const ConditionField = z.object({
  status: z.enum(["suspected", "not_observed", "unknown", "not_applicable"]),
  locations: z.array(z.string()),
  evidence_image_ids: z.array(z.string()),
  note_ko: z.string().nullable(),
});

export const GarmentAnalysisSchema = z.object({
  garment: z.object({
    category: Observed,
    color: Observed,
    silhouette: Observed,
    fit: Observed,
    collar_type: Observed,
    sleeve_type: Observed,
    design_features: ObservedList,
  }),
  care_label: z.object({
    product_code: Observed,
    material_composition: Observed,
    washing_instructions: ObservedList,
    visible_label_text: Observed,
  }),
  condition: z.object({
    pilling: ConditionField,
    stains: ConditionField,
    discoloration: ConditionField,
    tears: ConditionField,
    wear: ConditionField,
    zipper_condition: ConditionField,
    damage_locations: z.array(
      z.object({ location: z.string(), type: z.string(), evidence_image_ids: z.array(z.string()) }),
    ),
    additional_photos_needed: z.array(z.object({ target: z.enum(TARGETS), reason_ko: z.string() })),
  }),
  summary_ko: z.string(),
});
export type GarmentAnalysis = z.infer<typeof GarmentAnalysisSchema>;
export type ConditionFieldValue = z.infer<typeof ConditionField>;

export const CompareSchema = z.object({
  same_model: z.enum(["likely", "unlikely", "uncertain"]),
  matching_points_ko: z.array(z.string()),
  differences_ko: z.array(z.string()),
});
export type CompareResult = z.infer<typeof CompareSchema>;

export const DescriptionSchema = z.object({
  lines: z.array(
    z.object({
      text: z.string(),
      basis: z.enum(["product_db", "ai_observation"]),
      fact_keys: z.array(z.string()),
    }),
  ),
});
export type DescriptionOut = z.infer<typeof DescriptionSchema>;

export const StorySchema = z.object({
  blocks: z.array(z.object({ title: z.string(), body: z.string(), source_ids: z.array(z.string()) })),
});
export type StoryOut = z.infer<typeof StorySchema>;

/* ───────── 큐레이션 (프로토타입: 유니클로 상품 DB 역할을 Gemini 가 대신한다) ───────── */

export const CURATION_CATEGORIES = ["outer", "fleece", "knit", "shirt", "tee", "pants"] as const;
export const CURATION_FABRICS = ["fleece", "wool", "denim", "cotton", "knit", "nylon"] as const;

const Score = z.object({ score: z.number(), reason: z.string() });

export const CurationSchema = z.object({
  product: z.object({
    name: z.string(),
    name_ko: z.string(),
    card_label: z.string(),
    category: z.enum(CURATION_CATEGORIES),
    collection: z.string(),
    collab_partner: z.string().nullable(),
    release_year: z.number(),
    release_term: z.enum(["S/S", "F/W"]),
    material: z.string(),
    fit: z.string(),
    color_name: z.string(),
    description: z.string(),
  }),
  evaluation: z.object({ era: Score, scarcity: Score, design: Score, demand: Score, condition: Score }),
  scarcity: z.object({
    production_scale: z.enum(["limited", "small", "standard", "mass"]),
    production_note: z.string(),
    discontinued: z.boolean(),
    reissued: z.boolean(),
  }),
  condition: z.object({ label: z.string(), notes: z.array(z.string()) }),
  market: z.object({
    low: z.number(),
    high: z.number(),
    listings: z.number(),
    trend: z.enum(["up", "flat", "down"]),
  }),
  story: z.object({
    headline: z.string(),
    sections: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
  care: z.object({
    material: z.array(z.string()),
    washing: z.array(z.string()),
    storage: z.array(z.string()),
    tips: z.array(z.string()),
  }),
  garment: z.object({
    kind: z.enum(["top", "pants"]),
    color_hex: z.string(),
    fabric: z.enum(CURATION_FABRICS),
    collar: z.enum(["stand", "shirt", "crew", "lapel", "none"]),
    front: z.enum(["zip", "halfzip", "buttons", "none"]),
    sleeve: z.enum(["long", "short"]),
  }),
});
export type Curation = z.infer<typeof CurationSchema>;
