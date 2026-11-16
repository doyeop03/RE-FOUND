import type { Metadata } from "next";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "스캔하기" };

export default async function ScanPage() {
  const products = await getProducts();
  return <ScanFlow products={products} />;
}
