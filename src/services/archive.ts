import { CARE_GUIDES } from "@/data/care";
import { EDITORIALS } from "@/data/editorials";
import { PRODUCTS } from "@/data/products";
import { SHOPS } from "@/data/shops";
import { computeRarity } from "@/lib/rarity";
import type { CareGuide, Editorial, Product, Shop } from "@/types";

/**
 * 아카이브 조회 서비스.
 *
 * 지금은 로컬 Mock Data를 반환하지만, 모든 함수가 async 이므로
 * 내부를 `fetch(`${API_BASE}/products`)` (FastAPI) 나 Firestore 쿼리로 바꾸기만 하면 된다.
 * 화면 컴포넌트는 이 파일의 함수만 호출하고 data/ 폴더를 직접 참조하지 않는다.
 */

const ALL: Product[] = PRODUCTS.map((p) => ({
  ...p,
  rarity: computeRarity(p.scarcity, p.season),
}));

export async function getProducts(): Promise<Product[]> {
  return ALL;
}

export async function getProduct(id: string): Promise<Product | null> {
  return ALL.find((p) => p.id === id) ?? null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  return ids
    .map((id) => ALL.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
}

export async function getRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const scored = ALL.filter((p) => p.id !== product.id).map((p) => ({
    p,
    score:
      (p.category === product.category ? 2 : 0) +
      (p.collection === product.collection ? 1 : 0) +
      (Math.abs(p.season.year - product.season.year) <= 4 ? 1 : 0),
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.p);
}

export async function getCareGuide(product: Product): Promise<CareGuide> {
  return CARE_GUIDES[product.garment.fabric];
}

export async function getEditorials(): Promise<Editorial[]> {
  return EDITORIALS;
}

export async function getEditorial(slug: string): Promise<Editorial | null> {
  return EDITORIALS.find((e) => e.slug === slug) ?? null;
}

export async function getShops(): Promise<Shop[]> {
  return SHOPS;
}

export async function getShop(id: string): Promise<Shop | null> {
  return SHOPS.find((s) => s.id === id) ?? null;
}
