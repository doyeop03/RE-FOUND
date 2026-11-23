"use client";

import { PRODUCT_BUCKET, getSupabase } from "@/lib/supabase/client";
import type { ListingRow } from "@/lib/archive/record-rules";
import { normalizeCode } from "@/lib/scan/sanitize";

/**
 * 실제 상품 DB 조회 (Supabase · supabase/migrations 참고).
 * 이 파일은 Mock Data(src/data/products.ts)를 절대 참조하지 않는다.
 * DB가 연결되지 않으면 null 을 돌려주고, 화면은 '상품 DB 미연결'로 표시한다.
 */

export interface DbSource {
  id: string;
  kind: string;
  publisher: string;
  title: string | null;
  url: string;
  published_on: string | null;
  scope: "product" | "collection" | "brand";
  excerpt: string | null;
  verifies: string[] | null;
  checked_at: string;
}

export interface DbImage {
  id: string;
  role: string;
  storage_path: string | null;
  external_url: string | null;
  source_name: string;
  source_url: string;
  rights: "owned" | "licensed" | "permission_granted" | "unverified";
  rights_holder: string | null;
  rights_note: string | null;
}

export interface DbProduct {
  id: string;
  brand: string;
  product_code: string | null;
  product_code_normalized: string | null;
  name: string;
  name_ko: string | null;
  collection: string | null;
  release_year: number | null;
  release_season: string | null;
  category: string | null;
  color: string | null;
  material: string | null;
  fit: string | null;
  design_features: string[] | null;
  description: string | null;
  collab_partner: string | null;
  is_collaboration: boolean | null;
  limited_edition: boolean | null;
  discontinued: boolean | null;
  production_scale: "limited" | "small" | "standard" | "mass" | null;
  production_note: string | null;
  primary_source_url: string;
  product_sources: DbSource[];
  product_images: DbImage[];
}

const SELECT = "*, product_sources(*), product_images(*)";

export type DbResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "error"; message: string };

export async function findProductsByCode(code: string): Promise<DbResult<DbProduct[]>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "not_configured", message: "상품 DB(Supabase)가 연결되지 않았습니다." };
  const n = normalizeCode(code);
  if (!n) return { ok: true, data: [] };
  const { data, error } = await sb.from("products").select(SELECT).eq("product_code_normalized", n).limit(5);
  if (error) return { ok: false, reason: "error", message: error.message };
  return { ok: true, data: (data ?? []) as DbProduct[] };
}

/** 품번이 없거나 일치하는 상품이 없을 때 — 유형 키워드로 후보만 찾는다 (자동 확정하지 않음) */
export async function searchProductsByKeywords(keywords: string[]): Promise<DbResult<DbProduct[]>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "not_configured", message: "상품 DB(Supabase)가 연결되지 않았습니다." };
  const words = [...new Set(keywords.flatMap((k) => k.split(/[\s/·,]+/)).map((w) => w.replace(/[%,()]/g, "").trim()).filter((w) => w.length >= 2))].slice(0, 4);
  if (!words.length) return { ok: true, data: [] };
  const or = words.flatMap((w) => [`category.ilike.%${w}%`, `name.ilike.%${w}%`, `name_ko.ilike.%${w}%`]).join(",");
  const { data, error } = await sb.from("products").select(SELECT).or(or).limit(6);
  if (error) return { ok: false, reason: "error", message: error.message };
  return { ok: true, data: (data ?? []) as DbProduct[] };
}

export async function getMarketListings(productId: string): Promise<DbResult<ListingRow[]>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "not_configured", message: "상품 DB(Supabase)가 연결되지 않았습니다." };
  const { data, error } = await sb
    .from("market_listings")
    .select("price, currency, price_type, source_name, collected_at, sold_at")
    .eq("product_id", productId)
    .order("collected_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, reason: "error", message: error.message };
  return { ok: true, data: (data ?? []) as ListingRow[] };
}

/** 공개 가능한 기준 이미지의 URL — 권한 미확인 이미지는 쓰지 않는다 */
export function productImageUrl(img: DbImage): string | null {
  if (img.rights === "unverified") return null;
  if (img.storage_path) {
    const sb = getSupabase();
    return sb ? sb.storage.from(PRODUCT_BUCKET).getPublicUrl(img.storage_path).data.publicUrl : null;
  }
  return img.external_url;
}

export async function fetchImageBlob(url: string, signal?: AbortSignal): Promise<Blob | null> {
  try {
    const res = await fetch(url, { signal, mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.type.startsWith("image/") ? blob : null;
  } catch {
    return null;
  }
}
