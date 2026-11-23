import type { ImageRights, RecordSource } from "@/types/archive-record";

/**
 * archive_seed.json 의 URL을 RE:FOUND 쪽에서 직접 열어 확인한 기록.
 *
 * - seed JSON 원본은 수정하지 않고, 확인 결과는 이 파일에만 적는다.
 * - verifies 에는 "원문에서 실제로 읽은 내용"만 적는다. 추정이나 요약 해석은 넣지 않는다.
 * - 이미지는 응답(200)과 사용 권한을 별개로 본다. 권리자 허가가 기록되지 않은 이미지는
 *   rights: "unverified" 로 두고 화면에서 렌더링하지 않는다(출처 링크 + 이미지 등록 영역으로 대체).
 *
 * 허가를 받은 경우: 해당 URL의 rights 를 "licensed" 로 바꾸고 rightsNote 에 허가 근거(담당자 · 날짜 · 범위)를 적는다.
 */

export const SEED_CHECKED_AT = "2026-11-20";

export interface SourceCheck extends Omit<RecordSource, "id" | "url" | "checkedAt"> {
  httpStatus: number | null;
}

export const SOURCE_CHECKS: Record<string, SourceCheck> = {
  "https://eccoco.base.shop/items/79418011": {
    kind: "used_item_listing",
    label: "90年代 OLD UNIQLO ユニクロ ジップアップ フリースジャケット",
    publisher: "COCO (BASE 온라인숍)",
    date: null,
    scope: "item_listing",
    verifies: [
      "판매글 제목의 '90年代(1990년대)' 표기 — 판매자 표기이며 공식 확인 아님",
      "사이즈 XL 표기 (판매자 기재)",
      "제품 사진 6장 (판매자 촬영, 동일 실물)",
    ],
    httpStatus: 200,
  },
  "https://www.fastretailing.com/eng/group/news/1410151100.html": {
    kind: "official_history",
    label: "UNIQLO fleece 20th anniversary news release",
    publisher: "FAST RETAILING (공식)",
    date: "2014-10-15",
    scope: "brand",
    verifies: [
      "UNIQLO가 1994년 첫 플리스 제품을 선보임",
      "1998년 UNIQLO 하라주쿠점 개점과 함께 플리스를 일상 캐주얼웨어로 제안",
    ],
    httpStatus: 200,
  },
  "https://www.fastretailing.com/eng/about/history/2003.html": {
    kind: "official_history",
    label: "Fast Retailing History (1998)",
    publisher: "FAST RETAILING (공식)",
    date: null,
    scope: "brand",
    verifies: [
      "1998년 10월 1,900엔 플리스 캠페인이 높은 관심을 받음",
      "1998년 11월 첫 도심형 매장 UNIQLO 하라주쿠점 개점",
    ],
    httpStatus: 200,
  },
  "https://www.fashionsnap.com/article/2019-08-22/uniqlo-lifewear-magazine/": {
    kind: "magazine_retrospective",
    label: "「ユニクロ」がフリーマガジン創刊 (LifeWear magazine)",
    publisher: "FASHIONSNAP",
    date: "2019-08-22",
    scope: "brand",
    verifies: ["2019년 UNIQLO LifeWear magazine 창간 기사 — 이 상품의 1990년대 실물 화보가 아님"],
    httpStatus: 200,
  },
  "https://www.uniqlo.com/UniqloU17fw/uk/sp/men/": {
    kind: "official_collection",
    label: "UNIQLO U Fall Winter 2017 — Menswear (UK)",
    publisher: "UNIQLO (공식)",
    date: "2017",
    scope: "product",
    verifies: [
      "페이지 제목 'UNIQLO U Fall Winter 2017'",
      "상품 목록에 'Fleece cardigan £39.90' 게재",
    ],
    httpStatus: 200,
  },
  "https://www.gq.com/story/uniqlo-u-lemaire-2017": {
    kind: "press",
    label: "Uniqlo U Drops Tonight and It's Stuffed with More Lemaire Goodness",
    publisher: "GQ",
    date: "2017-10-05",
    scope: "collection",
    verifies: [
      "Uniqlo U를 크리스토프 르메르(Christophe Lemaire)의 라인으로 소개",
      "'Uniqlo U fleece cardigan, $40' 표기",
    ],
    httpStatus: 200,
  },
};

export interface ImageRightsCheck {
  rights: ImageRights;
  holder: string;
  httpStatus: number | null;
  rightsNote: string;
}

const SELLER_PHOTO: Omit<ImageRightsCheck, "httpStatus"> = {
  rights: "unverified",
  holder: "COCO (BASE 판매자)",
  rightsNote: "판매자가 상품 판매 목적으로 게시한 사진입니다. 재사용 허가가 확인되지 않아 표시하지 않습니다.",
};

export const IMAGE_RIGHTS: Record<string, ImageRightsCheck> = {
  "https://baseec-img-mng.akamaized.net/images/item/origin/64cf8c289738878212116d1ade4c1dfb.png": { ...SELLER_PHOTO, httpStatus: 200 },
  "https://baseec-img-mng.akamaized.net/images/item/origin/ccf643c33345ff9b3fe69fe47ce8badc.png": { ...SELLER_PHOTO, httpStatus: 200 },
  "https://baseec-img-mng.akamaized.net/images/item/origin/595373425ea6161ac2123652dc4e6c40.png": { ...SELLER_PHOTO, httpStatus: 200 },
  "https://baseec-img-mng.akamaized.net/images/item/origin/46b25b7648adcf5ea8ed96b777599992.jpg": { ...SELLER_PHOTO, httpStatus: 200 },
  "https://baseec-img-mng.akamaized.net/images/item/origin/a2be315ad87cb12d6aabc9b3abb40275.png": { ...SELLER_PHOTO, httpStatus: 200 },
  "https://baseec-img-mng.akamaized.net/images/item/origin/57572c4f78ead5a284f7adfff7727ed9.png": { ...SELLER_PHOTO, httpStatus: 200 },
  "https://fashionsnap-assets.com/article/images/2019/08/uniqlo-lifewear-magazine-4.jpg": {
    rights: "unverified",
    holder: "FASHIONSNAP / UNIQLO",
    httpStatus: 200,
    rightsNote: "언론사 기사 이미지입니다. 재사용 허가가 확인되지 않아 표시하지 않습니다.",
  },
  "https://media.gq.com/photos/59d3f5555738bb6db7434118/master/w_1600%2Cc_limit/8-uniqlo-u-fall-2017-menswear.jpg": {
    rights: "unverified",
    holder: "GQ (Condé Nast)",
    httpStatus: 200,
    rightsNote: "GQ 기사 이미지입니다. 재사용 허가가 확인되지 않아 표시하지 않습니다.",
  },
  "https://www.uniqlo.com/UniqloU17fw/common/images/sp/wear/mens/slide_06-2.jpg": {
    rights: "unverified",
    holder: "UNIQLO CO., LTD. (페이지 표기: ALL RIGHTS RESERVED)",
    httpStatus: 200,
    rightsNote: "공식 컬렉션 사이트 이미지이며 모든 권리가 유보되어 있습니다. 허가 전에는 표시하지 않습니다.",
  },
};
