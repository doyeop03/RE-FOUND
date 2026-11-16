import type { Editorial } from "@/types";

/**
 * 매거진 콘텐츠 (데모용 에디터 작성본).
 * 본문은 블록 배열로만 구성되어 있어, 향후 LLM이 같은 스키마의 JSON을 생성하면
 * 컴포넌트 수정 없이 그대로 렌더링할 수 있다.
 */
export const EDITORIALS: Editorial[] = [
  {
    slug: "the-fleece-era",
    issue: "ISSUE 01",
    title: "THE FLEECE ERA",
    subtitle: "모두가 플리스를 입던 시절",
    summary:
      "아웃도어 소재였던 플리스는 어떻게 겨울의 기본이 되었을까. 초기 플리스 재킷을 통해 한 시대를 돌아봅니다.",
    readMinutes: 4,
    coverProductId: "fleece-98-zip",
    tone: "light",
    generatedBy: "editor-demo",
    blocks: [
      {
        type: "lead",
        text: "따뜻하고, 가볍고, 누구나 살 수 있는 옷. 플리스가 겨울의 풍경을 바꾸는 데는 그리 오랜 시간이 걸리지 않았습니다.",
      },
      { type: "heading", text: "산에서 거리로" },
      {
        type: "paragraph",
        text: "플리스는 원래 등산과 야외 활동을 위한 기능성 소재였습니다. 물에 젖어도 금방 마르고, 가벼운 무게에 비해 보온성이 뛰어났기 때문입니다. 1990년대 후반, 이 소재가 일상복의 가격과 디자인으로 다시 만들어지면서 상황이 달라졌습니다.",
      },
      {
        type: "product",
        productId: "fleece-98-zip",
        caption: "초기형 플리스 집업 재킷. 스탠드 칼라와 밑단 리브의 구성은 지금도 그대로입니다.",
      },
      {
        type: "quote",
        text: "좋은 옷은 유행이 지나도 옷장에 남는다. 20년이 넘은 플리스가 그 증거다.",
      },
      { type: "heading", text: "색으로 고르는 옷" },
      {
        type: "paragraph",
        text: "플리스가 특별했던 또 하나의 이유는 색입니다. 같은 형태의 옷을 수십 가지 색으로 내놓는 방식은 옷을 고르는 기준을 바꿔 놓았습니다. 선명한 원색 플리스는 지금 빈티지 시장에서 그 시절을 상징하는 아이템으로 다시 주목받고 있습니다.",
      },
      {
        type: "product",
        productId: "fleece-00-halfzip",
        caption: "원색 컬러의 하프집 풀오버. 색이 선명하게 남아 있을수록 좋은 평가를 받습니다.",
      },
      {
        type: "paragraph",
        text: "오래된 플리스를 발견했다면 케어라벨과 지퍼 풀러부터 살펴보세요. 작은 디테일이 그 옷이 지나온 시간을 알려 줍니다.",
      },
    ],
    relatedProductIds: ["fleece-98-zip", "fleece-00-halfzip", "lambswool-03-crew"],
  },
  {
    slug: "timeless-basics",
    issue: "ISSUE 02",
    title: "TIMELESS BASICS",
    subtitle: "희귀하지 않아도 가치 있는 옷",
    summary:
      "옥스퍼드 셔츠, 램스울 니트, 스트레이트 진. 흔하지만 오래 입을 수 있다는 것이 왜 가치인지 이야기합니다.",
    readMinutes: 3,
    coverProductId: "oxford-07-shirt",
    tone: "dark",
    generatedBy: "editor-demo",
    blocks: [
      {
        type: "lead",
        text: "희귀도 C등급. 하지만 15년째 입고 있는 셔츠라면, 그 옷의 가치는 숫자로 설명되지 않습니다.",
      },
      { type: "heading", text: "흔한 옷의 조건" },
      {
        type: "paragraph",
        text: "기본 아이템은 매 시즌 비슷한 모습으로 다시 나옵니다. 그래서 희소성은 낮습니다. 하지만 바로 그 점 때문에 오래된 기본 아이템은 '얼마나 오래 입을 수 있는 옷인가'를 가장 정직하게 보여 줍니다.",
      },
      {
        type: "product",
        productId: "oxford-07-shirt",
        caption: "세탁을 거듭해 부드러워진 옥스퍼드 원단은 새 옷에서 얻을 수 없는 촉감을 줍니다.",
      },
      {
        type: "quote",
        text: "RE:FOUND의 희귀도 등급은 옷의 우열이 아니라, 얼마나 드문지를 말할 뿐이다.",
      },
      {
        type: "paragraph",
        text: "그래서 RE:FOUND는 희귀도와 별개로 수선과 클리닝을 제안합니다. 드물지 않은 옷일수록, 계속 입는 것이 가장 좋은 순환이기 때문입니다.",
      },
      {
        type: "product",
        productId: "selvedge-10-jeans",
        caption: "입은 사람의 생활이 그대로 남는 데님. 자연스러운 워싱은 시간이 만든 디테일입니다.",
      },
    ],
    relatedProductIds: ["oxford-07-shirt", "lambswool-03-crew", "selvedge-10-jeans"],
  },
  {
    slug: "the-archive-of-uniqlo",
    issue: "ISSUE 03",
    title: "THE ARCHIVE OF UNIQLO",
    subtitle: "협업이 남긴 옷들",
    summary:
      "디자이너와 아티스트의 이름이 붙은 옷은 왜 시간이 지나도 다시 찾게 될까. 협업 컬렉션의 아카이브를 살펴봅니다.",
    readMinutes: 5,
    coverProductId: "plusj-09-coat",
    tone: "light",
    generatedBy: "editor-demo",
    blocks: [
      {
        type: "lead",
        text: "협업 컬렉션은 발매 당일의 화제로 끝나지 않습니다. 10년이 지난 뒤에도 다시 찾게 되는 옷이 있습니다.",
      },
      { type: "heading", text: "코트 한 벌의 설득력" },
      {
        type: "paragraph",
        text: "절제된 테일러링으로 알려진 협업 컬렉션의 코트는 지금도 빈티지 시장에서 가장 많이 검색되는 품목 중 하나입니다. 한정 수량이었고, 다시 만들어지지 않았으며, 무엇보다 지금 입어도 낡아 보이지 않기 때문입니다.",
      },
      {
        type: "product",
        productId: "plusj-09-coat",
        caption: "좁은 라펠과 날렵한 어깨선. 현재 확인되는 매물은 손에 꼽습니다.",
      },
      { type: "heading", text: "화제성과 희귀도는 다르다" },
      {
        type: "paragraph",
        text: "반대로 발매 당시 가장 뜨거웠던 그래픽 티셔츠는 유통 물량이 많아 희귀도가 높지 않습니다. 수요가 높다고 해서 반드시 드문 것은 아닙니다. RE:FOUND가 수요와 희소성을 따로 평가하는 이유입니다.",
      },
      {
        type: "product",
        productId: "ut-19-artist",
        caption: "수요 5점, 희소성 2점. 인기와 희귀도가 엇갈리는 대표적인 사례입니다.",
      },
      {
        type: "quote",
        text: "아카이브는 비싼 옷의 목록이 아니라, 기억할 만한 옷의 기록이다.",
      },
      {
        type: "product",
        productId: "designer-17-stripe-knit",
        caption: "클래식을 유쾌하게 비튼 스트라이프 니트. 첫 시즌 제품은 전용 라벨로 구분합니다.",
      },
    ],
    relatedProductIds: [
      "plusj-09-coat",
      "designer-17-stripe-knit",
      "ut-19-artist",
      "uu-16-blouson",
    ],
  },
  {
    slug: "old-is-the-new-value",
    issue: "ISSUE 04",
    title: "OLD IS THE NEW VALUE",
    subtitle: "발견하고, 다시 입고, 다시 순환하다",
    summary:
      "빈티지 숍 행거에서 발견한 한 벌이 다시 누군가의 옷장으로 돌아가기까지. 빈티지 루프가 제안하는 옷의 다음 이야기.",
    readMinutes: 3,
    coverProductId: "m65-04-field",
    tone: "red",
    generatedBy: "editor-demo",
    blocks: [
      {
        type: "lead",
        text: "버려질 뻔한 옷이 발견되고, 가치를 확인받고, 다시 입혀집니다. 순환은 거창한 구호가 아니라 한 벌의 옷에서 시작됩니다.",
      },
      { type: "heading", text: "행거 사이에서" },
      {
        type: "paragraph",
        text: "빈티지 숍에서 익숙한 라벨을 발견하는 순간이 있습니다. 예전에는 그냥 지나쳤을 그 옷이 언제 만들어졌고, 얼마나 남아 있는지 알게 되면 옷을 보는 눈이 달라집니다.",
      },
      {
        type: "product",
        productId: "m65-04-field",
        caption: "균일하게 색이 바랜 필드 재킷. 20년의 시간이 만든 색입니다.",
      },
      { type: "heading", text: "다음 이야기를 고르는 일" },
      {
        type: "paragraph",
        text: "가치를 확인한 다음에는 선택이 남습니다. 계속 소장할 수도, 수선해서 더 오래 입을 수도, 다음 주인을 찾아 줄 수도 있습니다. 어떤 선택이든 옷의 수명은 한 번 더 늘어납니다.",
      },
      {
        type: "quote",
        text: "가장 지속 가능한 옷은 이미 만들어진 옷이다.",
      },
      {
        type: "product",
        productId: "denim-01-trucker",
        caption: "페이딩은 결함이 아니라 이력입니다. 수선과 클리닝으로 다음 10년을 준비할 수 있습니다.",
      },
    ],
    relatedProductIds: ["m65-04-field", "denim-01-trucker", "ut-03-graphic"],
  },
];
