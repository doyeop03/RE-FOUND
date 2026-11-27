import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/market/CheckoutForm";
import { getProduct, getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "주문 · 결제" };

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ id: p.id }));
}

export default async function Page({ params }: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <CheckoutForm product={product} />;
}
