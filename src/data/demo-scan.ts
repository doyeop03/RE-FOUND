import type { StaticImageData } from "next/image";
import type { Target } from "@/lib/scan/schemas";
import scanFront from "@/assets/demo/pufftech/scan-front.jpg";
import scanBack from "@/assets/demo/pufftech/scan-back.jpg";
import scanCareLabel from "@/assets/demo/pufftech/scan-care-label.jpg";
import scanNeckLabel from "@/assets/demo/pufftech/scan-neck-label.jpg";
import styleNow from "@/assets/demo/pufftech/style-now.jpg";
import styleThen from "@/assets/demo/pufftech/style-then.jpg";
import detailModel from "@/assets/demo/pufftech/detail-model.jpg";
import detailColors from "@/assets/demo/pufftech/detail-colors.jpg";

/**
 * 시연용 자료 (프로토타입).
 *
 * 1) 실제 옷 사진 4장 — 스캔 화면의 '시연 사진으로 진행'에서 카메라 대신 차례로 넣는다.
 *    AI 사진 확인 · 최종 분석 · 큐레이션은 실제 Gemini 호출로 진행된다.
 * 2) 큐레이션 자료 사진 — 실제 서비스에서는 유니클로 상품 DB(품번 기준)에서 가져올 스타일 · 상세 사진.
 *    프로토타입에서는 아래 품번이 인식되거나 시연 사진으로 진행한 경우에만 붙인다.
 */

export const DEMO_SCAN_PHOTOS: Partial<Record<Target, StaticImageData>> = {
  front_full: scanFront,
  back_full: scanBack,
  care_label: scanCareLabel,
  main_tag: scanNeckLabel,
};

export interface CurationImage {
  src: string;
  alt: string;
  source: string;
}

export interface CurationMedia {
  /** NOW · 지금의 스타일 */
  styleNow: CurationImage;
  /** THEN · 당시의 스타일 */
  styleThen: CurationImage;
  /** 아카이브 스토리 옆 제품 상세 사진 2장 */
  details: [CurationImage, CurationImage];
}

const SOURCE = "출처: UNIQLO 공식 이미지 (프로토타입 시연용)";

const MEDIA: Record<string, CurationMedia> = {
  pufftech: {
    styleNow: { src: styleNow.src, alt: "코트 안에 경량 패딩을 레이어드한 최근 착장", source: SOURCE },
    styleThen: { src: styleThen.src, alt: "아이보리 경량 패딩 재킷을 입은 당시 착장", source: SOURCE },
    details: [
      { src: detailModel.src, alt: "노칼라 경량 패딩 재킷 착용 컷", source: SOURCE },
      { src: detailColors.src, alt: "노칼라 경량 패딩 재킷 색상 구성", source: SOURCE },
    ],
  },
};

/** 품번(정규화) → 자료 키. 케어라벨 '211-487404(64-06)' 의 상품 번호 487404 */
const BY_CODE: [string, string][] = [["487404", "pufftech"]];

export const DEMO_MEDIA_KEY = "pufftech";

export function mediaKeyForCode(normalizedCode: string | null | undefined): string | null {
  if (!normalizedCode) return null;
  return BY_CODE.find(([code]) => normalizedCode.includes(code))?.[1] ?? null;
}

export function curationMedia(key: string | null | undefined): CurationMedia | null {
  return key ? MEDIA[key] ?? null : null;
}
