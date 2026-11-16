import type {
  ProductionScale,
  RarityFactor,
  RarityGrade,
  RarityResult,
  ScarcityIndicators,
  Season,
} from "@/types";

/**
 * 희귀도 등급 산정 로직.
 *
 * - 입력은 "희소성 지표"뿐이다 (경과 연수, 생산 규모, 단종 여부, 중고 매물량).
 * - 의류의 외관 상태와 수요는 일부러 넣지 않는다. 그 두 가지는 레이더 차트(종합 평가)에서만 다룬다.
 * - 현재 가중치는 데모용이며, 실제 데이터가 확보되면 이 파일만 교체하면 된다.
 */

const REFERENCE_YEAR = 2026;

const PRODUCTION_LABEL: Record<ProductionScale, string> = {
  limited: "한정 수량",
  small: "소량 생산",
  standard: "일반 생산",
  mass: "대량 생산",
};

const PRODUCTION_POINTS: Record<ProductionScale, number> = {
  limited: 30,
  small: 22,
  standard: 12,
  mass: 5,
};

function agePoints(years: number) {
  if (years >= 20) return 25;
  if (years >= 15) return 20;
  if (years >= 10) return 14;
  if (years >= 5) return 8;
  return 4;
}

function listingPoints(count: number) {
  if (count <= 5) return 25;
  if (count <= 12) return 18;
  if (count <= 25) return 10;
  return 4;
}

function toGrade(score: number): RarityGrade {
  if (score >= 85) return "S";
  if (score >= 65) return "A";
  if (score >= 45) return "B";
  return "C";
}

export function computeRarity(
  scarcity: ScarcityIndicators,
  season: Season,
): RarityResult {
  const years = REFERENCE_YEAR - season.year;
  const discontinuedPoints = scarcity.discontinued
    ? scarcity.reissued
      ? 10
      : 20
    : 0;

  const factors: RarityFactor[] = [
    {
      key: "age",
      label: "출시 후 경과",
      value: `약 ${years}년${season.estimated ? " (추정)" : ""}`,
      points: agePoints(years),
      max: 25,
    },
    {
      key: "production",
      label: "생산 규모",
      value: PRODUCTION_LABEL[scarcity.productionScale],
      points: PRODUCTION_POINTS[scarcity.productionScale],
      max: 30,
    },
    {
      key: "discontinued",
      label: "단종 여부",
      value: scarcity.discontinued
        ? scarcity.reissued
          ? "단종 · 복각 이력 있음"
          : "단종 · 복각 없음"
        : "유사 제품 계속 판매 중",
      points: discontinuedPoints,
      max: 20,
    },
    {
      key: "listings",
      label: "중고 매물량",
      value:
        scarcity.activeListings === 0
          ? "확인된 매물 없음"
          : `현재 ${scarcity.activeListings}건`,
      points: listingPoints(scarcity.activeListings),
      max: 25,
    },
  ];

  const score = factors.reduce((sum, f) => sum + f.points, 0);
  return { grade: toGrade(score), score, factors };
}

export const RARITY_ORDER: Record<RarityGrade, number> = {
  S: 4,
  A: 3,
  B: 2,
  C: 1,
};

export const RARITY_LABEL: Record<RarityGrade, string> = {
  S: "매우 높음",
  A: "높음",
  B: "보통",
  C: "낮음",
};
