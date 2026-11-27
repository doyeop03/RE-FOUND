import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellForm } from "@/components/market/SellForm";
import { getProduct, getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "판매 정보 작성" };

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}

export default async function Page({ params }: PageProps<"/sell/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <SellForm product={product} />;
}
