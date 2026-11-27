import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellDone } from "@/components/market/DoneViews";
import { getProduct, getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "판매 등록 완료" };

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}

export default async function Page({ params }: PageProps<"/sell/[id]/done">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <SellDone product={product} />;
}
