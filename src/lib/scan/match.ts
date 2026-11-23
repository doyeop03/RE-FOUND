import type { MatchSummary } from "@/types/archive-record";
import type { DbProduct } from "@/services/product-db";
import { normalizeCode } from "./sanitize";
import type { CompareResult, GarmentAnalysis } from "./schemas";

/**
 * 제품 식별 (순수 함수 · tests/match.test.ts)
 *
 * 우선순위
 * 1. 케어라벨 품번 ↔ 상품 DB 정확 일치
 * 2. 색상 · 형태 · 디자인 교차 검증
 * 3. DB 기준 이미지와 유사도 비교 (Gemini)
 * 4. 사용자에게 후보를 보여 주고 확인받기 — 어떤 경우에도 자동 확정하지 않는다
 */

export interface Candidate {
  product: DbProduct;
  method: "product_code" | "attributes";
  crossChecks: MatchSummary["crossChecks"];
  similarity: CompareResult | null;
  /** 정렬용 점수 (표시하지 않음) */
  rank: number;
}

const SYNONYMS: string[][] = [
  ["네이비", "navy", "남색"],
  ["블랙", "black", "검정", "검은"],
  ["화이트", "white", "흰", "하양", "오프화이트"],
  ["그레이", "gray", "grey", "회색", "차콜", "charcoal"],
  ["옐로", "옐로우", "yellow", "노랑", "노란", "머스타드"],
  ["카멜", "camel", "브라운", "brown", "갈색", "베이지", "beige"],
  ["레드", "red", "빨강", "빨간", "버건디"],
  ["블루", "blue", "파랑", "파란"],
  ["그린", "green", "초록", "카키", "khaki", "올리브"],
  ["플리스", "fleece", "후리스"],
  ["재킷", "자켓", "jacket", "집업", "zip"],
  ["카디건", "가디건", "cardigan"],
  ["셔츠", "shirt"],
  ["니트", "스웨터", "sweater", "knit"],
  ["코트", "coat"],
  ["팬츠", "바지", "pants", "jeans", "청바지"],
  ["스탠드", "stand", "하이넥"],
  ["긴소매", "롱슬리브", "long"],
];

function tokens(text: string | null | undefined) {
  if (!text) return new Set<string>();
  const lower = text.toLowerCase();
  const out = new Set<string>();
  SYNONYMS.forEach((group, i) => {
    if (group.some((w) => lower.includes(w.toLowerCase()))) out.add(`g${i}`);
  });
  return out;
}

export function compareField(field: string, db: string | null, observed: string | null): MatchSummary["crossChecks"][number] {
  if (!db || !observed) return { field, db, observed, result: "unknown" };
  const a = tokens(db);
  const b = tokens(observed);
  if (a.size === 0 || b.size === 0) return { field, db, observed, result: "unknown" };
  const shared = [...a].some((t) => b.has(t));
  return { field, db, observed, result: shared ? "match" : "mismatch" };
}

export function crossCheck(product: DbProduct, analysis: GarmentAnalysis): MatchSummary["crossChecks"] {
  const g = analysis.garment;
  return [
    compareField("색상", product.color, g.color.value),
    compareField("유형", product.category ?? product.name, g.category.value),
    compareField("디자인", (product.design_features ?? []).join(", ") || null, [g.collar_type.value, g.sleeve_type.value, ...g.design_features.value].filter(Boolean).join(", ") || null),
  ];
}

export function buildCandidates(
  analysis: GarmentAnalysis,
  byCode: DbProduct[],
  byKeyword: DbProduct[],
): Candidate[] {
  const code = normalizeCode(analysis.care_label.product_code.value);
  const seen = new Set<string>();
  const out: Candidate[] = [];
  const push = (p: DbProduct, method: Candidate["method"]) => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    const checks = crossCheck(p, analysis);
    const mismatches = checks.filter((c) => c.result === "mismatch").length;
    const matches = checks.filter((c) => c.result === "match").length;
    const codeHit = method === "product_code" && code !== null && p.product_code_normalized === code;
    out.push({ product: p, method, crossChecks: checks, similarity: null, rank: (codeHit ? 100 : 0) + matches * 10 - mismatches * 15 });
  };
  byCode.forEach((p) => push(p, "product_code"));
  byKeyword.forEach((p) => push(p, "attributes"));
  return out.sort((a, b) => b.rank - a.rank).slice(0, 5);
}

export function applySimilarity(c: Candidate, s: CompareResult): Candidate {
  const bonus = s.same_model === "likely" ? 20 : s.same_model === "unlikely" ? -30 : 0;
  return { ...c, similarity: s, rank: c.rank + bonus };
}

export function summarizeMatch(
  status: MatchSummary["status"],
  chosen: Candidate | null,
  recognizedCode: string | null,
  candidateCount: number,
): MatchSummary {
  if (status === "db_unavailable") {
    return {
      status,
      method: null,
      productId: null,
      recognizedCode,
      crossChecks: [],
      note: "상품 DB가 연결되지 않아 제품을 조회하지 못했습니다. 제품 정보는 '제품 미확인'으로 표시합니다.",
    };
  }
  if (!chosen) {
    return {
      status: "unconfirmed",
      method: null,
      productId: null,
      recognizedCode,
      crossChecks: [],
      note: recognizedCode
        ? `케어라벨 품번 ${recognizedCode}을(를) 인식했지만 ${candidateCount ? "사용자가 일치하는 후보를 고르지 않았습니다" : "상품 DB에 해당 제품이 없습니다"}. 제품 미확인으로 기록합니다.`
        : candidateCount
          ? "품번을 읽지 못했고 사용자가 일치하는 후보를 고르지 않았습니다. 제품 미확인으로 기록합니다."
          : "품번을 읽지 못했고 비슷한 상품도 DB에서 찾지 못했습니다. 제품 미확인으로 기록합니다.",
    };
  }
  const how = chosen.method === "product_code" ? "케어라벨 품번이 DB와 정확히 일치했고" : "품번 일치 없이 유형 · 색상 후보 중에서";
  return {
    status: "confirmed",
    method: chosen.method === "product_code" ? "product_code" : "manual",
    productId: chosen.product.id,
    recognizedCode,
    crossChecks: chosen.crossChecks,
    note: `${how} 사용자가 '${chosen.product.name}'을(를) 직접 확인했습니다.${chosen.crossChecks.some((c) => c.result === "mismatch") ? " 일부 항목이 사진과 다르게 보여 추가 확인이 필요합니다." : ""}`,
  };
}
