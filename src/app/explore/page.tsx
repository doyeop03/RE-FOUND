import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/ExploreView";
import { SEED_RECORDS } from "@/lib/archive/seed-records";
import { getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "발견하기" };

export default async function ExplorePage() {
  const products = await getProducts();
  return <ExploreView products={products} records={SEED_RECORDS} />;
}
