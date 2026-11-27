"use client";

import { SellForm } from "@/components/market/SellForm";
import { ScanProductGate } from "@/components/scan/ScanProductGate";

/** 스캔한 옷의 판매 정보 작성 (Figma 10) — /sell/scan/?session=<id> */
export default function ScanSellPage() {
  return <ScanProductGate>{({ product }) => <SellForm product={product} />}</ScanProductGate>;
}
