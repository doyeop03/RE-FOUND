import type { Metadata } from "next";
import { MyArchiveView } from "@/components/closet/MyArchiveView";
import { getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "나의 옷장" };

export default async function MyPage() {
  const products = await getProducts();
  return <MyArchiveView products={products} />;
}
