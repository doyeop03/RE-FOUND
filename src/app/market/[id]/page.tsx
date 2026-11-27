import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketDetail } from "@/components/market/MarketDetail";
import { getCareGuide, getProduct, getProducts } from "@/services/archive";

/** Figma 09 — 판매 상품 상세 (정적 배포를 위해 모든 데모 제품 경로를 만든다. 판매 정보는 화면에서 확인) */
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/market/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product ? `${product.name} · 판매 상품` : "판매 상품" };
}

export default async function MarketPage({ params }: PageProps<"/market/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const care = await getCareGuide(product);
  return <MarketDetail product={product} care={care} />;
}
