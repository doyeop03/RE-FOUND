import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/archive/ProductDetail";
import { RecordDetail } from "@/components/archive/record/RecordDetail";
import { getCareGuide, getProduct, getProducts } from "@/services/archive";
import { SEED_RECORDS, getSeedRecord } from "@/lib/archive/seed-records";

export async function generateStaticParams() {
  const products = await getProducts();
  return [...products.map((p) => ({ id: p.id })), ...SEED_RECORDS.map((r) => ({ id: r.id }))];
}

export async function generateMetadata({ params }: PageProps<"/archive/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  const record = getSeedRecord(id);
  return { title: product?.name ?? record?.displayName ?? "아카이브" };
}

export default async function ArchiveDetailPage({ params }: PageProps<"/archive/[id]">) {
  const { id } = await params;
  // 출처 확인 자료(seed)는 Mock 제품과 다른 데이터 구조 · 다른 화면으로 그린다
  const record = getSeedRecord(id);
  if (record) {
    return <RecordDetail record={record} related={SEED_RECORDS.filter((r) => r.id !== record.id)} />;
  }

  const product = await getProduct(id);
  if (!product) notFound();

  return <ProductDetail product={product} care={await getCareGuide(product)} />;
}
