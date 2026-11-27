import type { Category, MarketData, Season } from "@/types";

export function won(value: number) {
  return value.toLocaleString("ko-KR");
}

export function priceRange(market: MarketData | null) {
  if (!market) return "가격 정보 없음";
  return `₩${won(market.low)} – ${won(market.high)}`;
}

export function seasonLabel(season: Season) {
  if (season.label) return season.label;
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

/** 한국어 조사 — 마지막 글자에 받침이 있으면 a(이 · 을 · 과), 없으면 b(가 · 를 · 와) */
export function josa(word: string, a: string, b: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return b;
  return code % 28 === 0 ? b : a;
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
