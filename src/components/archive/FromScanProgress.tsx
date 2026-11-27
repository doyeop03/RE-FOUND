"use client";

import { ScanProgress } from "@/components/scan/ScanSidebar";
import { useQueryString } from "@/lib/use-query";

/** 스캔 결과로 들어온 상세 페이지(?from=scan)에만 '3. 결과' 진행 막대를 보여 준다 (Figma 05) */
export function FromScanProgress({ className }: { className?: string }) {
  const qs = useQueryString();
  if (new URLSearchParams(qs).get("from") !== "scan") return null;
  return <ScanProgress active={2} variant="result" className={className} />;
}
