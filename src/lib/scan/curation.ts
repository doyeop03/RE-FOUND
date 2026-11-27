import { VINTAGE_TYPE } from "@/data/vintage-types";
import { computeRarity } from "@/lib/rarity";
import type { CareGuide, EvalKey, GarmentSpec, MarketData, Product, StorySection } from "@/types";
import type { Curation } from "./schemas";

/**
 * Gemini 큐레이션 → 아카이브 상세(Figma 05)가 그리는 Product.
 * 순수 함수 (tests/curation.test.ts).
 *
 * 프로토타입 전제: 실제 서비스에서는 이 값들이 유니클로 자체 상품 정보에서 온다.
 * 지금은 Gemini 가 그 DB 역할을 대신하므로, 화면 문구는 '유니클로 아카이브 정보'로 표시한다.
 */

export interface ScanProduct extends Product {
  care: CareGuide;
  /** 큐레이션 자료 사진 키 (data/demo-scan.ts) — 실제 서비스에서는 상품 DB의 스타일 · 상세 사진 */
  mediaKey?: string | null;
}

const STORY_LABELS = [
  "THE ERA · 출시된 시대",
  "THE COLLECTION · 컬렉션의 특징",
  "THE HERITAGE · 디자인 헤리티지",
  "THE VINTAGE POINT · 주목할 특징",
  "HOW TO WEAR · 지금의 스타일링",
];

const DRIFT = {
  up: [0.86, 0.9, 0.93, 0.95, 0.98, 1],
  flat: [0.99, 1.01, 0.98, 1, 1.01, 1],
  down: [1.08, 1.06, 1.05, 1.02, 1.01, 1],
} as const;

/** 다섯 가치 중 가장 높은 값으로 빈티지 유형을 정한다 (Figma 08 판정 기준) */
const TYPE_OF: Record<EvalKey, keyof typeof VINTAGE_TYPE> = {
  era: "era",
  scarcity: "heritage",
  design: "icon",
  condition: "mint",
  demand: "trend",
};
const TIE_ORDER: EvalKey[] = ["era", "scarcity", "design", "demand", "condition"];

const clampScore = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
const round1000 = (n: number) => Math.max(1000, Math.round(n / 1000) * 1000);

export function vintageTypeOf(evaluation: Record<EvalKey, { score: number }>) {
  const scores = TIE_ORDER.map((k) => evaluation[k].score);
  if (scores.every((s) => s >= 5)) return VINTAGE_TYPE.allround;
  if (scores.every((s) => s <= 1)) return VINTAGE_TYPE.potential;
  const top = TIE_ORDER.reduce((best, k) => (evaluation[k].score > evaluation[best].score ? k : best), TIE_ORDER[0]);
  return VINTAGE_TYPE[TYPE_OF[top]];
}

function marketFrom(m: Curation["market"], now: Date): MarketData {
  let low = round1000(Math.min(m.low, m.high));
  let high = round1000(Math.max(m.low, m.high));
  if (high === low) high = low + 10_000;
  if (low <= 0) low = 1000;
  const mid = (low + high) / 2;
  const drift = DRIFT[m.trend];
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getMonth() + 1}월`;
  });
  return {
    low,
    high,
    listings: Math.max(1, Math.round(m.listings)),
    asOf: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`,
    trend: months.map((month, i) => ({
      month,
      low: round1000(low * drift[i]),
      median: round1000(mid * drift[i]),
      high: round1000(high * drift[i]),
    })),
  };
}

function garmentFrom(g: Curation["garment"], category: Curation["product"]["category"]): GarmentSpec {
  const hex = /^#[0-9a-f]{6}$/i.test(g.color_hex) ? g.color_hex : "#3a3f4b";
  return {
    kind: g.kind === "pants" || category === "pants" ? "pants" : "top",
    color: hex,
    fabric: g.fabric,
    sleeve: g.sleeve,
    collar: g.collar === "none" ? undefined : g.collar,
    front: g.front,
    ribHem: g.fabric === "fleece" || g.fabric === "knit",
  };
}

export function productIdFor(sessionId: string) {
  return `scan-${sessionId}`;
}

export function curationToProduct(c: Curation, sessionId: string, now = new Date()): ScanProduct {
  const p = c.product;
  const year = Math.min(now.getFullYear(), Math.max(1984, Math.round(p.release_year)));
  const evaluation = Object.fromEntries(
    TIE_ORDER.map((k) => [k, { score: clampScore(c.evaluation[k].score), reason: c.evaluation[k].reason }]),
  ) as Product["evaluation"];
  const type = vintageTypeOf(evaluation);
  const season = { year, term: p.release_term, estimated: false };
  const scarcity = {
    productionScale: c.scarcity.production_scale,
    productionNote: c.scarcity.production_note,
    discontinued: c.scarcity.discontinued,
    reissued: c.scarcity.reissued,
    activeListings: Math.max(1, Math.round(c.market.listings)),
  };
  const sections: StorySection[] = c.story.sections.slice(0, STORY_LABELS.length).map((s, i) => ({
    label: STORY_LABELS[i],
    title: s.title,
    body: s.body,
  }));

  return {
    id: productIdFor(sessionId),
    name: p.name,
    cardLabel: p.card_label.toUpperCase(),
    nameKo: p.name_ko,
    category: p.category,
    collection: p.collection,
    collab: p.collab_partner ? { partner: p.collab_partner, note: `${p.collab_partner} 협업` } : null,
    season,
    material: p.material,
    fit: p.fit,
    color: { name: p.color_name },
    garment: garmentFrom(c.garment, p.category),
    description: p.description,
    archiveType: { label: type.label, en: type.en, desc: type.desc },
    evaluation,
    scarcity,
    condition: { label: c.condition.label, notes: c.condition.notes },
    market: marketFrom(c.market, now),
    story: { kicker: "ARCHIVE STORY", headline: c.story.headline, sections },
    provenance: {
      source: "유니클로 아카이브 정보",
      status: "demo",
      note: "프로토타입에서는 유니클로 상품 DB 대신 AI가 사진을 분석해 작성했습니다.",
    },
    registeredAt: now.toISOString().slice(0, 10),
    rarity: computeRarity(scarcity, season),
    verification: null,
    care: c.care,
  };
}
