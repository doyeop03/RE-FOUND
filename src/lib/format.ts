import type { Category, MarketData, Season } from "@/types";

export function won(value: number) {
  return value.toLocaleString("ko-KR");
}

export function priceRange(market: MarketData | null) {
  if (!market) return "가격 정보 없음";
  return `₩${won(market.low)} – ${won(market.high)}`;
}

export function seasonLabel(season: Season) {
  return `${season.year} ${season.term}${season.estimated ? " (추정)" : ""}`;
}

export function shortYear(season: Season) {
  return `'${String(season.year).slice(2)}`;
}

export function dateLabel(iso: string) {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export const CATEGORY_LABEL: Record<Category, string> = {
  outer: "아우터",
  fleece: "플리스",
  knit: "니트",
  shirt: "셔츠",
  tee: "티셔츠",
  pants: "팬츠",
};

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
