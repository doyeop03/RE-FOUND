import { LISTINGS } from "@/data/listings";
import type { ClosetEntry, DealMethod, Listing, Product } from "@/types";

export const DEAL_METHOD_LABEL: Record<DealMethod, string> = { parcel: "택배 배송", direct: "직거래" };

export const DEFAULT_SHIPPING = "배송비 3,000원 · 결제 후 2일 이내 발송";

/**
 * 제품의 판매 정보.
 * 이 기기에서 내가 판매 등록한 옷(옷장 · 판매 중)이 있으면 그것을, 없으면 시연용 판매 상품을 쓴다.
 */
export function findListing(product: Product, closet: ClosetEntry[]): Listing | null {
  const mine = closet.find((e) => e.productId === product.id && e.selling && e.askingPrice);
  if (mine?.askingPrice) {
    const terms = mine.listing ?? { size: "-", method: "parcel" as const, shipping: DEFAULT_SHIPPING, shippingFee: 3000 };
    return {
      ...terms,
      productId: product.id,
      price: mine.askingPrice,
      conditionLabel: mine.conditionLabel,
      conditionNote: product.condition.notes[0] ?? mine.conditionLabel,
      seller: "나 (이 기기 · 데모)",
      status: "on_sale",
      mine: true,
    };
  }
  return LISTINGS.find((l) => l.productId === product.id) ?? null;
}

/** 직거래는 배송비가 없다 */
export const shippingFeeOf = (l: Pick<Listing, "method" | "shippingFee">) => (l.method === "direct" ? 0 : l.shippingFee);
