import { describe, expect, it } from "vitest";
import { curationToProduct, vintageTypeOf } from "@/lib/scan/curation";
import { CurationSchema, type Curation } from "@/lib/scan/schemas";

const base: Curation = {
  product: {
    name: "'98 Fleece Jacket",
    name_ko: "플리스 풀집업 재킷",
    card_label: "fleece",
    category: "fleece",
    collection: "UNIQLO Archive",
    collab_partner: null,
    release_year: 1998,
    release_term: "F/W",
    material: "폴리에스터 100%",
    fit: "레귤러",
    color_name: "네이비",
    description: "설명",
  },
  evaluation: {
    era: { score: 5, reason: "a" },
    scarcity: { score: 3, reason: "b" },
    design: { score: 4, reason: "c" },
    demand: { score: 4, reason: "d" },
    condition: { score: 7, reason: "e" },
  },
  scarcity: { production_scale: "mass", production_note: "n", discontinued: true, reissued: false },
  condition: { label: "양호", notes: ["소매 끝 가벼운 보풀"] },
  market: { low: 68_400, high: 45_200, listings: 12.4, trend: "up" },
  story: { headline: "플리스의 시작, 1998", sections: Array.from({ length: 6 }, (_, i) => ({ title: `t${i}`, body: `b${i}` })) },
  care: { material: ["m"], washing: ["w"], storage: ["s"], tips: ["t"] },
  garment: { kind: "top", color_hex: "navy", fabric: "fleece", collar: "stand", front: "zip", sleeve: "long" },
};

describe("큐레이션 → Product", () => {
  const now = new Date("2026-11-28T00:00:00Z");
  const p = curationToProduct(CurationSchema.parse(base), "abc", now);

  it("가격 범위를 정렬 · 반올림하고 6개월 추이를 만든다", () => {
    expect(p.market).toMatchObject({ low: 45_000, high: 68_000, listings: 12 });
    expect(p.market?.trend).toHaveLength(6);
    expect(p.market?.trend.at(-1)?.month).toBe("11월");
  });

  it("점수는 1~5로 자르고, 가장 높은 가치로 빈티지 유형을 정한다", () => {
    expect(p.evaluation.condition.score).toBe(5);
    expect(p.archiveType.label).toBe("시대 아카이브형"); // era 5 · condition 5 동점 → 앞 순서(era)
  });

  it("스토리는 5개 섹션만, 고정 라벨을 붙인다", () => {
    expect(p.story.sections).toHaveLength(5);
    expect(p.story.sections[0].label).toContain("THE ERA");
  });

  it("잘못된 색상 코드는 기본색으로 바꾸고 id 는 세션 기반", () => {
    expect(p.garment.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.id).toBe("scan-abc");
    expect(p.cardLabel).toBe("FLEECE");
    expect(p.rarity.grade).toMatch(/[SABC]/);
  });

  it("전부 5점이면 올라운드형, 전부 1점이면 잠재 아카이브형", () => {
    const all = (n: number) => ({ era: { score: n }, scarcity: { score: n }, design: { score: n }, demand: { score: n }, condition: { score: n } });
    expect(vintageTypeOf(all(5)).label).toBe("올라운드형");
    expect(vintageTypeOf(all(1)).label).toBe("잠재 아카이브형");
  });
});
