import { TARGET_LABEL, type Target } from "./schemas";

/**
 * Gemini 지시문. 공통 규칙:
 * - 손상을 '확정'하지 않는다. 보이는 근거가 있을 때만 suspected.
 * - 사진으로 판단할 수 없으면 null / unknown.
 * - 브랜드 · 출시연도 · 모델명 · 역사를 추측하지 않는다.
 * - 품번은 라벨에 인쇄된 문자를 그대로 옮기고, 읽을 수 없으면 null.
 */

const RULES = `
STRICT RULES
- You are a careful garment inspector for a vintage UNIQLO archive. You only describe what is visible in the provided images.
- Never invent or guess: brand, model name, release year, season, collection, history or price.
- Damage is NEVER confirmed. Use "suspected" only when you can point to visible evidence in a specific image. If the area is clearly visible and shows no sign, use "not_observed". If the area is not visible or the image is unclear, use "unknown".
- Product codes / text on labels: copy characters exactly as printed. If any character is uncertain, set product_code to null and legibility to "partial" or "illegible". Do not complete partial numbers.
- If something cannot be judged from the photos, return null / "unknown" / empty arrays.
- All *_ko fields must be short, polite Korean sentences addressed to the user (존댓말).
`.trim();

const EXPECT: Record<string, string> = {
  front_full: "the whole FRONT of the garment laid flat or hung, entire garment inside the frame",
  back_full: "the whole BACK of the garment laid flat or hung, entire garment inside the frame",
  care_label: "a close-up of the CARE LABEL (washing symbols, material composition, product number)",
};

export function shotReviewPrompt(target: Target, imageId: string, attempt: number) {
  const expected = EXPECT[target] ?? `a close-up of the ${TARGET_LABEL[target]} (${target}) area of the garment`;
  return `${RULES}

TASK: Review ONE photo taken during a guided capture session.
Image id: ${imageId}
Expected view: ${expected}
Attempt: ${attempt}

Check:
1. Is it a garment, and does it match the expected view? Is the whole garment inside the frame (for full views)?
2. Sharpness and lighting. For care labels, can the product number be read character by character?
3. Are the collar, sleeves, zipper, hem visible (for full views)? List visible_parts.
4. Any visible signs of pilling, stains, discoloration, tears, wear, zipper problems? Add each as a concern with its location and confidence.
5. If a closer photo of a specific part is needed to decide a concern, add a detail_request (max 2) with a Korean instruction such as "오른쪽 소매에 마모가 의심됩니다. 소매 부분을 가까이 촬영해주세요." Do not request parts already shown in close-up.
6. Set retake_needed=true only if THIS photo cannot serve the expected view (not a garment, wrong view, garment cut off, too blurry, too dark). Give retake_instruction_ko such as "뒷면 전체가 보이지 않습니다. 옷을 펼쳐 다시 촬영해주세요." or "케어라벨의 제품번호가 흐릿합니다. 조금 더 가까이 촬영해주세요."
7. label_reading: fill only if a label is visible in this photo, otherwise null.`;
}

export function garmentAnalysisPrompt(images: { id: string; target: Target; reviewed: boolean }[]) {
  const list = images.map((i) => `- ${i.id}: ${TARGET_LABEL[i.target]} (${i.target})`).join("\n");
  return `${RULES}

TASK: Produce the final structured analysis of ONE garment from all photos below. Each photo is preceded by its id.
Photos:
${list}

- Every observed value must list the ids of the photos that show it in evidence_image_ids. Use only ids from the list.
- garment.*: describe in Korean (e.g. category "플리스 집업 재킷", color "네이비", fit "레귤러" only if inferable from shape).
- care_label.product_code: exact printed product number or null. visible_label_text: transcribe the label text you can read (keep original language).
- condition.*: suspected / not_observed / unknown as defined above. zipper_condition: not_applicable if there is no zipper. You can only judge the zipper visually (not its function) — say so in note_ko.
- damage_locations: one entry per suspected area.
- additional_photos_needed: parts that still need a photo to decide (empty if none).
- summary_ko: 2 short sentences of what is visible. No history, no year, no model name.`;
}

export function comparePrompt(candidateName: string) {
  return `${RULES}

TASK: Image A is the user's photo of a garment. Image B is a reference photo registered for the catalogue product "${candidateName}".
Compare only visible design elements (silhouette, collar, closure, pockets, panels, trims, color blocking, logo placement).
same_model: "likely" only when the design elements clearly match; "unlikely" if clear differences exist; otherwise "uncertain".
List matching points and differences in short Korean phrases. Color differences may come from lighting — mention but do not decide on color alone.`;
}

export function descriptionPrompt(factsJson: string, observationsJson: string) {
  return `${RULES}

TASK: Write a short product description (2–4 Korean sentences, magazine tone, concise) for an archive detail page.
You may ONLY use:
- FACTS from the product database (verified, with sources): ${factsJson}
- OBSERVATIONS from photos of this specific garment (AI observation, not verified): ${observationsJson}
Each line must set basis="product_db" (only facts) or "ai_observation" (only observations) and list the fact keys it uses in fact_keys.
Do not mention any year, season, collaboration or history that is not literally in FACTS. Do not mention brand history.`;
}

export function storyPrompt(productJson: string, sourcesJson: string) {
  return `${RULES}

TASK: Write a short archive heritage note (1–3 blocks; each block = short English title + 1–2 Korean sentences).
Use ONLY the source excerpts below. Every block must cite the ids of the sources it uses in source_ids.
If a source is brand-level (scope "brand"), say it is brand history and do NOT present it as the history of this specific product.
If the excerpts do not support any statement about this product, return an empty blocks array.
PRODUCT: ${productJson}
SOURCES: ${sourcesJson}`;
}
