"use client";

import { SellDone } from "@/components/market/DoneViews";
import { ScanProductGate } from "@/components/scan/ScanProductGate";

/** 스캔한 옷의 판매 등록 완료 (Figma 11) — /sell/scan/done/?session=<id> */
export default function ScanSellDonePage() {
  return <ScanProductGate>{({ product }) => <SellDone product={product} />}</ScanProductGate>;
}
