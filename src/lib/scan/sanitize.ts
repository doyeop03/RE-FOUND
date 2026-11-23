import type { DescriptionOut, GarmentAnalysis, ShotReview, StoryOut } from "./schemas";

/**
 * 모델 응답 후처리 — 스키마는 통과했지만 규칙을 어긴 값을 걸러 낸다.
 * (순수 함수 · tests/sanitize.test.ts)
 */

export function normalizeCode(code: string | null | undefined) {
  if (!code) return null;
  const n = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return n.length >= 4 ? n : null;
}

/** 품번이 모델이 옮겨 적은 라벨 원문에 실제로 들어 있는지 — 없으면 지어낸 값으로 보고 버린다 */
export function codeAppearsInText(code: string, text: string | null | undefined) {
  if (!text) return false;
  const n = normalizeCode(code);
  if (!n) return false;
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(n);
}

export function sanitizeShotReview(r: ShotReview): ShotReview {
  const reading = r.label_reading;
  let label = reading;
  if (reading?.product_code) {
    const ok = reading.product_code_legibility === "clear" && codeAppearsInText(reading.product_code, reading.visible_text ?? reading.product_code);
    label = ok ? { ...reading, product_code: reading.product_code.trim() } : { ...reading, product_code: null, product_code_legibility: reading.product_code_legibility === "clear" ? "partial" : reading.product_code_legibility };
  }
  return {
    ...r,
    // 무한 요청 방지: 사진 1장당 추가 촬영 요청은 최대 2개
    detail_requests: r.detail_requests.slice(0, 2),
    label_reading: label,
  };
}

export function sanitizeAnalysis(a: GarmentAnalysis, imageIds: string[]): GarmentAnalysis {
  const known = new Set(imageIds);
  const ev = (ids: string[]) => ids.filter((id) => known.has(id));

  const obs = <T extends { value: unknown; status: "observed" | "unknown"; evidence_image_ids: string[] }>(o: T, empty: T["value"]): T => {
    const ids = ev(o.evidence_image_ids);
    const hasValue = Array.isArray(o.value) ? o.value.length > 0 : o.value !== null && o.value !== "";
    if (o.status === "observed" && hasValue && ids.length > 0) return { ...o, evidence_image_ids: ids };
    return { ...o, value: empty, status: "unknown", evidence_image_ids: [] };
  };

  const cond = (c: GarmentAnalysis["condition"]["pilling"]) => {
    const ids = ev(c.evidence_image_ids);
    // 근거 사진 없는 '의심'·'발견되지 않음'은 판단 근거가 없으므로 unknown
    if ((c.status === "suspected" || c.status === "not_observed") && ids.length === 0) {
      return { ...c, status: "unknown" as const, evidence_image_ids: [], locations: [] };
    }
    return { ...c, evidence_image_ids: ids };
  };

  const g = a.garment;
  const l = a.care_label;
  const labelText = obs(l.visible_label_text, null);
  let code = obs(l.product_code, null);
  if (code.value && !codeAppearsInText(code.value, labelText.value)) {
    code = { ...code, value: null, status: "unknown", evidence_image_ids: [] };
  }

  return {
    garment: {
      category: obs(g.category, null),
      color: obs(g.color, null),
      silhouette: obs(g.silhouette, null),
      fit: obs(g.fit, null),
      collar_type: obs(g.collar_type, null),
      sleeve_type: obs(g.sleeve_type, null),
      design_features: obs(g.design_features, []),
    },
    care_label: {
      product_code: code,
      material_composition: obs(l.material_composition, null),
      washing_instructions: obs(l.washing_instructions, []),
      visible_label_text: labelText,
    },
    condition: {
      pilling: cond(a.condition.pilling),
      stains: cond(a.condition.stains),
      discoloration: cond(a.condition.discoloration),
      tears: cond(a.condition.tears),
      wear: cond(a.condition.wear),
      zipper_condition: cond(a.condition.zipper_condition),
      damage_locations: a.condition.damage_locations
        .map((d) => ({ ...d, evidence_image_ids: ev(d.evidence_image_ids) }))
        .filter((d) => d.evidence_image_ids.length > 0),
      additional_photos_needed: a.condition.additional_photos_needed.slice(0, 4),
    },
    summary_ko: a.summary_ko,
  };
}

const YEAR = /(?:19|20)\d{2}/g;

/** 설명문 가드 — 사실에 없는 연도가 들어간 문장, 존재하지 않는 사실 키를 쓴 문장을 버린다 */
export function guardDescription(out: DescriptionOut, facts: Record<string, unknown>) {
  const allowedYears = new Set(
    Object.values(facts)
      .flatMap((v) => String(v ?? "").match(YEAR) ?? [])
      .map(String),
  );
  return out.lines
    .filter((line) => (line.text.match(YEAR) ?? []).every((y) => allowedYears.has(y)))
    .filter((line) => line.basis !== "product_db" || (line.fact_keys.length > 0 && line.fact_keys.every((k) => k in facts)))
    .slice(0, 4);
}

/** 스토리 가드 — 출처 id 가 없거나 출처 원문에 없는 연도를 쓴 블록을 버린다 */
export function guardStory(out: StoryOut, sources: { id: string; excerpt: string }[]) {
  const byId = new Map(sources.map((s) => [s.id, s.excerpt]));
  return out.blocks
    .map((b) => ({ ...b, source_ids: b.source_ids.filter((id) => byId.has(id)) }))
    .filter((b) => b.source_ids.length > 0)
    .filter((b) => {
      const text = b.source_ids.map((id) => byId.get(id)).join(" ");
      return (`${b.title} ${b.body}`.match(YEAR) ?? []).every((y) => text.includes(y));
    })
    .slice(0, 3);
}
