import { Schema } from "firebase/ai";
import { CONCERN_TYPES, TARGETS } from "./schemas";

/**
 * Firebase AI Logic responseSchema — schemas.ts(zod)와 같은 구조를 유지한다.
 * (tests/gemini-schemas.test.ts 가 두 정의의 필드 이름이 어긋나지 않는지 확인한다)
 */

const str = () => Schema.string();
const nstr = () => Schema.string({ nullable: true });
const strArr = () => Schema.array({ items: Schema.string() });
const en = (values: readonly string[]) => Schema.enumString({ enum: [...values] });

const observed = () =>
  Schema.object({
    properties: { value: nstr(), status: en(["observed", "unknown"]), evidence_image_ids: strArr() },
  });
const observedList = () =>
  Schema.object({
    properties: { value: strArr(), status: en(["observed", "unknown"]), evidence_image_ids: strArr() },
  });
const condition = () =>
  Schema.object({
    properties: {
      status: en(["suspected", "not_observed", "unknown", "not_applicable"]),
      locations: strArr(),
      evidence_image_ids: strArr(),
      note_ko: nstr(),
    },
  });

export const shotReviewSchema = Schema.object({
  properties: {
    is_garment: Schema.boolean(),
    matches_expected_view: Schema.boolean(),
    framing: en(["full", "partial", "too_close", "too_far", "unknown"]),
    sharpness: en(["sharp", "slightly_blurry", "blurry"]),
    lighting: en(["ok", "too_dark", "glare", "unknown"]),
    retake_needed: Schema.boolean(),
    retake_instruction_ko: nstr(),
    visible_parts: Schema.array({ items: en(TARGETS) }),
    concerns: Schema.array({
      items: Schema.object({
        properties: {
          type: en(CONCERN_TYPES),
          location: en(TARGETS),
          confidence: en(["low", "medium", "high"]),
          description_ko: str(),
        },
      }),
    }),
    detail_requests: Schema.array({
      items: Schema.object({ properties: { target: en(TARGETS), reason_ko: str(), instruction_ko: str() } }),
    }),
    label_reading: Schema.object({
      nullable: true,
      properties: {
        product_code: nstr(),
        product_code_legibility: en(["clear", "partial", "illegible", "not_present"]),
        visible_text: nstr(),
      },
    }),
  },
});

export const garmentAnalysisSchema = Schema.object({
  properties: {
    garment: Schema.object({
      properties: {
        category: observed(),
        color: observed(),
        silhouette: observed(),
        fit: observed(),
        collar_type: observed(),
        sleeve_type: observed(),
        design_features: observedList(),
      },
    }),
    care_label: Schema.object({
      properties: {
        product_code: observed(),
        material_composition: observed(),
        washing_instructions: observedList(),
        visible_label_text: observed(),
      },
    }),
    condition: Schema.object({
      properties: {
        pilling: condition(),
        stains: condition(),
        discoloration: condition(),
        tears: condition(),
        wear: condition(),
        zipper_condition: condition(),
        damage_locations: Schema.array({
          items: Schema.object({ properties: { location: str(), type: str(), evidence_image_ids: strArr() } }),
        }),
        additional_photos_needed: Schema.array({
          items: Schema.object({ properties: { target: en(TARGETS), reason_ko: str() } }),
        }),
      },
    }),
    summary_ko: str(),
  },
});

export const compareSchema = Schema.object({
  properties: {
    same_model: en(["likely", "unlikely", "uncertain"]),
    matching_points_ko: strArr(),
    differences_ko: strArr(),
  },
});

export const descriptionSchema = Schema.object({
  properties: {
    lines: Schema.array({
      items: Schema.object({
        properties: { text: str(), basis: en(["product_db", "ai_observation"]), fact_keys: strArr() },
      }),
    }),
  },
});

export const storySchema = Schema.object({
  properties: {
    blocks: Schema.array({
      items: Schema.object({ properties: { title: str(), body: str(), source_ids: strArr() } }),
    }),
  },
});
