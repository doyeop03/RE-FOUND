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

/**
 * 큐레이션 — 프로토타입 전제:
 * 실제 서비스에서는 유니클로가 보유한 자체 상품 정보(품번 · 출시 시즌 · 컬렉션 · 생산량 · 시세)로 이 내용을 채운다.
 * 프로토타입에는 그 DB가 없으므로 Gemini 가 '유니클로 아카이브 담당자'로서 사진 분석 결과에 맞는 레코드를 작성한다.
 * 그래서 위 RULES(추측 금지)를 쓰지 않는다. 대신 사진에서 관찰한 값과 어긋나지 않게 쓰도록 한다.
 */
export function curationPrompt(analysisJson: string, today: string) {
  return `You are the archive curator of UNIQLO's internal product archive (RE:FOUND service).
PROTOTYPE CONTEXT: In the real service every field below comes from UNIQLO's own product database (product code → name, release season, collection, production volume, resale prices, heritage notes). In this prototype that database is not connected, so YOU act as that database and write the record yourself.

INPUT
- Photos of ONE garment owned by the user (each photo preceded by its id).
- PHOTO ANALYSIS already extracted from these photos (JSON): ${analysisJson}
- Today: ${today}

WRITE A COMPLETE ARCHIVE RECORD
- Write confidently and specifically, as the official archive would. Never write "unknown", "추정", "AI", "확인 불가" or hedge words. Every field must be filled.
- Stay consistent with the photo analysis: category, color, material composition, design features, collar, closure and condition must match what was observed. If the label shows a product code or material, use it.
- Pick the most plausible UNIQLO release year and season for this exact item. Use the line / technology names printed on the labels (e.g. PUFFTECH, ULTRA LIGHT DOWN, HEATTECH, AIRism, FLEECE), the label format, design and materials as clues. The year must be consistent with when that line was actually sold — never place a line before it existed. Recent items are fine; do not force an old year.
- product.name: short English display name in the style "'98 Fleece Jacket" or "Old UNIQLO Coverall" (≤ 28 chars).
- product.name_ko: Korean product name (e.g. "플리스 풀집업 재킷").
- product.card_label: one English uppercase word for the category card (e.g. FLEECE, JACKET, KNIT, SHIRT, DENIM, TEE, COAT, PANTS).
- product.collection: e.g. "UNIQLO Archive", "UNIQLO U", "+J", "UT". collab_partner: partner name only if it is a collaboration line, else null.
- product.material: Korean composition like "폴리에스터 100%" or "코튼 65% · 나일론 35%". fit: one Korean word (레귤러 / 오버사이즈 / 슬림 / 릴랙스). color_name: Korean color (네이비, 차콜 …).
- product.description: 3–4 Korean sentences, magazine tone — what the item is, what makes this era/line special, and its design point.
- evaluation: five values, each an integer score 1–5 with a short Korean reason (≤ 24 chars).
  era = 시대성 (how strongly it shows its era), scarcity = 서사성 (story / heritage), design = 대표성 (how iconic for UNIQLO), demand = 수요성 (current resale demand), condition = 보존성 (preservation — base it on the photo analysis condition).
- scarcity.production_scale: limited / small / standard / mass, with a Korean production_note (1 sentence). discontinued / reissued: booleans.
- condition.label: one of "최상", "양호", "보통", "사용감 있음" — based on the photo analysis. condition.notes: 2–4 short Korean notes from the observed condition (e.g. "소매 끝 가벼운 보풀", "지퍼 작동 정상").
- market: realistic current Korean second-hand ASKING price range in KRW (integers, rounded to 1,000), number of comparable listings (integer 3–40), and 6-month trend (up / flat / down).
- story.headline: a short Korean headline for the archive story with the year (e.g. "플리스의 시작, 1998").
- story.sections: EXACTLY 5 sections in this order, each = Korean title (≤ 16 chars) + Korean body (2 sentences):
  1 the era it was released in, 2 the collection / line, 3 the design heritage, 4 the vintage point to notice (label, hardware, fabric clues), 5 how to wear it today.
- care: 3 short Korean lines each — material (fabric character), washing, storage, tips (repair / keeping it long).
- garment: values for an illustration fallback — kind, color_hex (#RRGGBB of the main color), fabric, collar, front closure, sleeve.
- All Korean text in polite, concise magazine style. No emoji.`;
}
