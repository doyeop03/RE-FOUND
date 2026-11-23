import type { RarityGrade } from "@/types";
import type {
  Fact,
  FactBasis,
  FactStatus,
  RarityFactorRecord,
  RecordRarity,
  RecordVerification,
  VerificationLevel,
  VintageTypeResult,
} from "@/types/archive-record";

/**
 * 실제 데이터 레코드용 판정 규칙.
 * 순수 함수만 둔다 (테스트: tests/record-rules.test.ts).
 * 근거가 없는 항목은 점수 계산에서 '0점'이 아니라 '제외'된다.
 */

export function fact<T>(value: T | null, status: FactStatus, basis: FactBasis, extra: Partial<Fact<T>> = {}): Fact<T> {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
    return { value: null, status: "unknown", basis: "none", ...extra, sourceIds: extra.sourceIds ?? [] };
  }
  return { value, status, basis, ...extra };
}

export function unknown<T>(note?: string): Fact<T> {
  return { value: null, status: "unknown", basis: "none", note };
}

export const FACT_STATUS_LABEL: Record<FactStatus, string> = {
  verified: "확인됨",
  claimed: "표기 · 미확인",
  observed: "AI 관찰",
  unknown: "정보 없음",
};

export const BASIS_LABEL: Record<FactBasis, string> = {
  official: "공식 자료",
  press: "언론 보도",
  seller_listing: "판매처 표기",
  product_db: "상품 DB",
  ai_observation: "AI 관찰",
  user: "사용자 입력",
  none: "근거 없음",
};

/* ───────── 희귀도 ───────── */

export interface RarityInputs {
  /** 확인된 출시연도만 넣는다 (판매처 표기 연대는 넣지 않음) */
  releaseYear: number | null;
  discontinued: boolean | null;
  /** undefined: 자료 없음 · null: 협업 아님이 확인됨 · string: 협업 파트너 */
  collabPartner: string | null | undefined;
  productionScale: "limited" | "small" | "standard" | "mass" | null;
  productionNote?: string | null;
  /** 연결된 시장 데이터가 있을 때만 숫자 */
  activeListings: number | null;
  soldLast90Days: number | null;
  now?: Date;
}

const PRODUCTION_LABEL = { limited: "한정 생산", small: "소량 생산", standard: "일반 생산", mass: "대량 생산" } as const;

export const RARITY_MIN_FACTORS = 4;

export function computeRecordRarity(input: RarityInputs): RecordRarity {
  const year = (input.now ?? new Date()).getFullYear();
  const factors: RarityFactorRecord[] = [];

  const age = input.releaseYear !== null ? year - input.releaseYear : null;
  factors.push({
    key: "age",
    label: "출시연도",
    value: age !== null ? `${input.releaseYear}년 · ${age}년 경과` : null,
    available: age !== null,
    points: age === null ? null : age >= 25 ? 30 : age >= 20 ? 25 : age >= 15 ? 18 : age >= 10 ? 12 : age >= 5 ? 6 : 2,
    max: 30,
  });

  factors.push({
    key: "discontinued",
    label: "단종 여부",
    value: input.discontinued === null ? null : input.discontinued ? "단종" : "판매 중",
    available: input.discontinued !== null,
    points: input.discontinued === null ? null : input.discontinued ? 15 : 0,
    max: 15,
  });

  factors.push({
    key: "collab",
    label: "협업 여부",
    value: input.collabPartner === undefined ? null : input.collabPartner ? `협업 · ${input.collabPartner}` : "협업 아님",
    available: input.collabPartner !== undefined,
    points: input.collabPartner === undefined ? null : input.collabPartner ? 10 : 0,
    max: 10,
  });

  const prodPoints = { limited: 25, small: 18, standard: 8, mass: 3 } as const;
  factors.push({
    key: "production",
    label: "생산량",
    value: input.productionScale ? PRODUCTION_LABEL[input.productionScale] : null,
    available: input.productionScale !== null,
    points: input.productionScale ? prodPoints[input.productionScale] : null,
    max: 25,
    note: input.productionNote ?? undefined,
  });

  const l = input.activeListings;
  factors.push({
    key: "listings",
    label: "중고시장 매물 수",
    value: l === null ? null : `${l}건`,
    available: l !== null,
    points: l === null ? null : l <= 2 ? 20 : l <= 5 ? 15 : l <= 10 ? 10 : l <= 20 ? 5 : 2,
    max: 20,
  });

  const d = input.soldLast90Days;
  factors.push({
    key: "demand",
    label: "시장 수요 (최근 90일 거래)",
    value: d === null ? null : `${d}건`,
    available: d !== null,
    points: d === null ? null : d >= 10 ? 10 : d >= 5 ? 7 : d >= 1 ? 4 : 1,
    max: 10,
  });

  const available = factors.filter((f) => f.available);
  const hasSupply = available.some((f) => f.key === "production" || f.key === "listings");

  if (available.length < RARITY_MIN_FACTORS || !hasSupply) {
    return {
      status: "insufficient",
      grade: null,
      score: null,
      maxScore: null,
      factors,
      note: `판정 자료 부족 — 6개 항목 중 ${available.length}개만 확인되었습니다. 생산량 또는 실제 매물 데이터를 포함해 ${RARITY_MIN_FACTORS}개 이상이 확인되어야 등급을 산정합니다.`,
    };
  }

  const sum = available.reduce((s, f) => s + (f.points ?? 0), 0);
  const maxScore = available.reduce((s, f) => s + f.max, 0);
  const score = Math.round((sum / maxScore) * 100);
  const grade: RarityGrade = score >= 85 ? "S" : score >= 65 ? "A" : score >= 45 ? "B" : "C";
  return {
    status: "graded",
    grade,
    score,
    maxScore,
    factors,
    note: `확인된 ${available.length}개 항목만으로 산정했습니다. 확인되지 않은 항목은 0점이 아니라 계산에서 제외됩니다.`,
  };
}

/* ───────── 빈티지 유형 ───────── */

export function decideVintageType(input: {
  releaseYear: number | null;
  collabPartner: string | null | undefined;
  limitedEdition: boolean | null;
  now?: Date;
}): { type: VintageTypeResult | null; note: string } {
  if (input.releaseYear === null) {
    return { type: null, note: "출시연도가 확인되지 않아 빈티지 유형을 정하지 않았습니다." };
  }
  const age = (input.now ?? new Date()).getFullYear() - input.releaseYear;
  if (input.collabPartner) {
    return {
      type: {
        label: "협업 컬렉션형",
        en: "Collaboration",
        desc: "외부 디자이너 · 브랜드와의 협업으로 만들어진 제품",
        reason: `협업 파트너(${input.collabPartner})가 확인된 자료에 기록되어 있습니다.`,
      },
      note: "",
    };
  }
  if (input.limitedEdition === true) {
    return {
      type: { label: "한정 컬렉션형", en: "Limited", desc: "한정 수량 · 기간으로 출시된 제품", reason: "한정 출시가 확인된 자료에 기록되어 있습니다." },
      note: "",
    };
  }
  if (age >= 20) {
    return {
      type: {
        label: "시대 아카이브형",
        en: "Era Archive",
        desc: "특정 시기의 브랜드 디자인을 보여 주는 20년 이상 된 제품",
        reason: `확인된 출시연도 ${input.releaseYear}년 기준 ${age}년이 지났습니다.`,
      },
      note: "",
    };
  }
  return {
    type: {
      label: "일반 아카이브형",
      en: "General Archive",
      desc: "출시 시기와 컬렉션이 확인된 정규 라인 제품",
      reason: `출시 시즌은 확인되었으나 협업 · 한정 출시를 뒷받침하는 자료는 없습니다 (${input.releaseYear}년 · ${age}년 경과).`,
    },
    note: "",
  };
}

/* ───────── 검증 단계 ───────── */

export const VERIFICATION_LEVEL_LABEL: Record<VerificationLevel, { label: string; en: string; desc: string }> = {
  none: { label: "미검증", en: "NOT VERIFIED", desc: "AI 분석 · 아카이브 대조 · 검수 기록이 없습니다." },
  ai_analyzed: {
    label: "AI 분석 완료",
    en: "AI ANALYZED",
    desc: "촬영 사진을 Gemini가 분석했습니다. 정품 인증이 아닙니다.",
  },
  archive_matched: {
    label: "아카이브 정보 확인",
    en: "ARCHIVE MATCHED",
    desc: "출처가 있는 상품 정보와 대조되었습니다. 개별 실물의 정품 인증은 아닙니다.",
  },
  verified: {
    label: "검증 완료",
    en: "VERIFIED",
    desc: "RE:FOUND 검수 담당자의 별도 검수 절차를 통과했습니다.",
  },
};

export function buildVerification(input: {
  recordNo: string;
  date: string | null;
  aiAnalyzed: { done: boolean; detail: string };
  archiveMatched: { done: boolean; detail: string };
  verified: { done: boolean; detail: string };
}): RecordVerification {
  const level: VerificationLevel = input.verified.done
    ? "verified"
    : input.archiveMatched.done
      ? "archive_matched"
      : input.aiAnalyzed.done
        ? "ai_analyzed"
        : "none";
  return {
    level,
    recordNo: input.recordNo,
    date: input.date,
    note: VERIFICATION_LEVEL_LABEL[level].desc,
    stages: [
      { key: "ai_analyzed", label: VERIFICATION_LEVEL_LABEL.ai_analyzed.label, ...input.aiAnalyzed },
      { key: "archive_matched", label: VERIFICATION_LEVEL_LABEL.archive_matched.label, ...input.archiveMatched },
      { key: "verified", label: VERIFICATION_LEVEL_LABEL.verified.label, ...input.verified },
    ],
  };
}

/* ───────── 시세 ───────── */

export interface ListingRow {
  price: number;
  currency: string;
  price_type: "asking" | "sold";
  source_name: string;
  collected_at: string;
  sold_at?: string | null;
}

/** 최근 90일 실거래 건수 — 실거래 데이터가 하나도 없으면 null (0건과 구분) */
export function soldInLastDays(rows: ListingRow[], days = 90, now = new Date()) {
  const sold = rows.filter((r) => r.price_type === "sold");
  if (sold.length === 0) return null;
  const from = now.getTime() - days * 86_400_000;
  return sold.filter((r) => new Date(r.sold_at ?? r.collected_at).getTime() >= from).length;
}

export function summarizeMarket(rows: ListingRow[]) {
  if (rows.length === 0) return null;
  const currency = rows[0].currency;
  const same = rows.filter((r) => r.currency === currency);
  const stats = (type: "asking" | "sold") => {
    const prices = same.filter((r) => r.price_type === type).map((r) => r.price).sort((a, b) => a - b);
    if (prices.length === 0) return null;
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
    return { count: prices.length, low: prices[0], high: prices[prices.length - 1], median };
  };
  const dates = same.map((r) => r.collected_at.slice(0, 10)).sort();
  return {
    currency,
    asking: stats("asking"),
    sold: stats("sold"),
    sources: [...new Set(same.map((r) => r.source_name))],
    collectedFrom: dates[0] ?? null,
    collectedTo: dates[dates.length - 1] ?? null,
  };
}
