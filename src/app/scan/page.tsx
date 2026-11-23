import type { Metadata } from "next";
import { ScanFlow } from "@/components/scan/ScanFlow";

export const metadata: Metadata = { title: "스캔하기" };

export default function ScanPage() {
  return <ScanFlow />;
}
