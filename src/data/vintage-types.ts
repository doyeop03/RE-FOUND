/**
 * 빈티지 유형 (Figma 08 발견하기 · 05 아카이브 상세).
 * 다섯 가지 가치(수요성 · 서사성 · 시대성 · 대표성 · 보존성) 중 가장 두드러진 값으로 유형을 정한다.
 * 데모 제품의 유형은 디자인 시안의 배정을 그대로 따른다 (products.ts).
 */

export interface VintageType {
  label: string;
  en: string;
  desc: string;
  /** 발견하기 필터 아래의 판정 기준 안내 */
  rule: string;
}

export const VINTAGE_TYPE = {
  era: {
    label: "시대 아카이브형",
    en: "Era Archive",
    desc: "특정 시대의 패션 트렌드와 디자인, 문화적 특징을 담아 당시의 모습을 보여주는 제품",
    rule: "시대성 高",
  },
  heritage: {
    label: "헤리티지형",
    en: "Heritage",
    desc: "오래 이어져 온 디자인과 제작 방식의 이야기를 간직해, 브랜드의 역사를 보여주는 제품",
    rule: "서사성 高",
  },
  icon: {
    label: "아이콘형",
    en: "Icon",
    desc: "한 시기의 유니클로를 대표하는 디자인으로, 한눈에 브랜드를 떠올리게 하는 제품",
    rule: "대표성 高",
  },
  mint: {
    label: "민트 컨디션형",
    en: "Mint Condition",
    desc: "오랜 시간이 지나도 보존 상태가 뛰어나 처음의 모습을 잘 간직한 제품",
    rule: "보존성 高",
  },
  trend: {
    label: "트렌드형",
    en: "Trend",
    desc: "지금의 스타일과 잘 맞아 빈티지 시장에서 다시 찾는 사람이 많은 제품",
    rule: "수요성 高",
  },
  potential: {
    label: "잠재 아카이브형",
    en: "Potential Archive",
    desc: "아직 가치가 드러나지 않았지만, 기록으로 남겨 둘 의미가 있는 제품",
    rule: "전체 1점",
  },
  allround: {
    label: "올라운드형",
    en: "All-round",
    desc: "다섯 가지 가치가 모두 높아 어느 기준으로 보아도 아카이브 가치가 큰 제품",
    rule: "전체 5점",
  },
} satisfies Record<string, VintageType>;

/** 필터 버튼 순서 (Figma 08) */
export const VINTAGE_TYPE_ORDER = ["era", "heritage", "icon", "mint", "trend", "potential", "allround"] as const;

/** 필터 아래 판정 기준 안내 — 다섯 가치 기준 / 전체 점수 기준 */
export const VINTAGE_TYPE_RULES = [
  ["trend", "heritage", "era", "icon", "mint"],
  ["potential", "allround"],
] as const;
