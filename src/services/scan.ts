import type { ScanResult, ScanSlotKey, ScanStep } from "@/types";

/**
 * 스캔(분석) 서비스 — 현재는 DEMO.
 *
 * 실제 연동 시 교체 지점:
 *  1) 사진 업로드        → POST /scan/upload            (스토리지)
 *  2) 의류 이미지 분석   → 비전 AI                      (카테고리·색상·디테일)
 *  3) 케어라벨 인식      → OCR                          (품번·소재·제조 시기)
 *  4) 아카이브 매칭      → GET  /archive/match          (Firestore / 벡터 검색)
 *  5) 시장 데이터        → GET  /market/listings        (중고 매물 API)
 *
 * 반환 타입(ScanResult)은 그대로 두고 analyzeGarment 내부만 바꾸면 화면은 수정할 필요가 없다.
 */

export const SCAN_STEPS: ScanStep[] = [
  { key: "image", label: "의류 이미지 분석 중", doneLabel: "의류 이미지 분석" },
  { key: "label", label: "케어라벨 확인 중", doneLabel: "케어라벨 확인" },
  { key: "archive", label: "유니클로 아카이브 검색 중", doneLabel: "아카이브 검색" },
  { key: "condition", label: "외관 상태 확인 중", doneLabel: "외관 상태 확인" },
  { key: "market", label: "빈티지 시장 데이터 비교 중", doneLabel: "시장 데이터 비교" },
  { key: "rarity", label: "희귀도 계산 중", doneLabel: "희귀도 계산" },
];

const STEP_MS = 750;

/** 데모에서는 어떤 사진을 올려도 이 샘플 제품으로 매칭된다 */
const DEMO_MATCH_ID = "fleece-98-zip";

export interface ScanInput {
  photos: Partial<Record<ScanSlotKey, File | "sample">>;
}

export async function analyzeGarment(
  input: ScanInput,
  onStep: (index: number) => void,
  signal?: AbortSignal,
): Promise<ScanResult> {
  for (let i = 0; i < SCAN_STEPS.length; i += 1) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    onStep(i);
    await new Promise((resolve) => setTimeout(resolve, STEP_MS));
  }
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  onStep(SCAN_STEPS.length);

  const hasDamagePhoto = Boolean(input.photos.damage);
  return {
    productId: DEMO_MATCH_ID,
    confidence: 0.87,
    condition: {
      label: "양호",
      notes: hasDamagePhoto
        ? ["소매 끝 가벼운 보풀", "손상 부위 사진 1건 접수", "변색·얼룩 없음"]
        : ["소매 끝 가벼운 보풀", "지퍼 작동 정상", "변색·얼룩 없음"],
    },
    isDemo: true,
  };
}
