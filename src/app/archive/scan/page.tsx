import type { Metadata } from "next";
import { ScanRecordView } from "@/components/scan/ScanRecordView";

export const metadata: Metadata = { title: "내 스캔 아카이브" };

/** 실제 촬영 결과 상세 (정적 페이지 1개 + 쿼리스트링 ?session=) */
export default function ScanRecordPage() {
  return <ScanRecordView />;
}
