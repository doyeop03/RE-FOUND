import type { Listing } from "@/types";

/**
 * 시연용 판매 상품 (Figma 08 · 09 · 12).
 * 실제 판매자 · 거래와 무관한 가상의 데이터다. 내가 등록한 판매는 app-store 의 옷장 항목에서 만든다 (lib/listing.ts).
 *
 * 판매가는 상품 자료의 가격을 그대로 쓰고, 엔화로 받은 세 벌은 100엔 = 930원으로 환산해 100원 단위로 반올림했다.
 *   마운틴 파카 ¥3,290 → ₩30,600 · 보아 플리스 재킷 ¥2,200 → ₩20,500 · 데님 트러커 재킷 ¥2,190 → ₩20,400
 */

const SHIPPING = { method: "parcel" as const, shipping: "배송비 3,000원 · 결제 후 2일 이내 발송", shippingFee: 3000 };
const SELLER = "RE:FOUND 데모 판매자";

function listing(productId: string, price: number, conditionNote: string, size = "M", conditionLabel = "양호"): Listing {
  return { ...SHIPPING, productId, price, size, conditionLabel, conditionNote, seller: SELLER, status: "on_sale", mine: false };
}

export const LISTINGS: Listing[] = [
  listing("fleece-98-zip", 20500, "소매 끝에 가벼운 보풀", "L"),
  listing("ut-03-graphic", 29900, "프린트 갈라짐 없음"),
  listing("fleece-00-halfzip", 13500, "밑단에 가벼운 보풀"),
  listing("uu-16-blouson", 39600, "소매 끝 가벼운 오염"),
  listing("plusj-09-coat", 32000, "안감 사용감"),
  listing("ut-19-artist", 29000, "목 리브 탄력 양호"),
  listing("m65-04-field", 30600, "후드 끈 사용감"),
  listing("designer-17-stripe-knit", 55000, "자연스러운 워싱 · 색 바램"),
  listing("selvedge-10-jeans", 68000, "밑단 가벼운 마모"),
  listing("lambswool-03-crew", 32000, "팔꿈치 골 눌림"),
  listing("oxford-07-shirt", 30000, "골 눌림 적음"),
  listing("denim-01-trucker", 20400, "단추 상태 양호"),
  listing("duffle-23-coat", 36000, "소매 끝 가벼운 마모"),
];
