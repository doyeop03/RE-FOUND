"use client";

import { MarketDetail } from "@/components/market/MarketDetail";
import { ScanProductGate } from "@/components/scan/ScanProductGate";

/** 스캔한 옷의 판매 상품 상세 (Figma 09) — /market/scan/?session=<id> */
export default function ScanMarketPage() {
  return (
    <ScanProductGate>
      {({ product, photos, media }) => <MarketDetail product={product} care={product.care} photos={photos} media={media} />}
    </ScanProductGate>
  );
}
