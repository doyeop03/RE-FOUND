#!/usr/bin/env node
/**
 * RE:FOUND 상품 DB 등록 스크립트 (개발자 전용 · service role).
 *
 * 사용법
 *   node --env-file=.env.local scripts/register-product.mjs supabase/seed/uniqlo-u-fleece-cardigan-2017fw.json --dry-run
 *   node --env-file=.env.local scripts/register-product.mjs supabase/seed/uniqlo-u-fleece-cardigan-2017fw.json
 *
 * 필요한 환경 변수 (.env.local — 절대 커밋하지 않는다)
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...   (서버 · 로컬 전용 비밀 키, NEXT_PUBLIC_ 접두사 금지)
 *
 * 규칙 — 하나라도 어기면 아무것도 등록하지 않는다
 *   - 모든 상품은 primary_source_url 과 1개 이상의 출처(sources)를 가진다
 *   - 출처는 url · publisher · scope · checked_at(직접 확인한 날짜) 필수
 *   - 이미지는 source_url · rights · checked_at 필수. rights 가 unverified 가 아니면 rights_note(허가 근거) 필수
 *   - 시세(listings)는 source_url · collected_at 필수, sold 는 sold_at 필수
 *   - 출처가 없는 값은 비워 둔다(null). 추정값을 넣지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const url = z
  .string()
  .regex(/^https?:\/\//, "http(s) URL 이어야 합니다")
  .refine((u) => !/^https?:\/\/[^/]*[가-힣]/.test(u), "템플릿의 예시 URL을 실제 출처 URL로 바꿔 주세요");
const PLACEHOLDER = /공식 상품명|원문에서 그대로|이 출처로 확인한 내용|이름 또는 팀|케어라벨에 인쇄된/;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

const Source = z.object({
  kind: z.enum(["official_collection", "official_history", "press", "magazine_retrospective", "used_item_listing", "other"]),
  publisher: z.string().min(1),
  title: z.string().nullable().optional(),
  url,
  published_on: date.nullable().optional(),
  scope: z.enum(["product", "collection", "brand"]),
  excerpt: z.string().nullable().optional(),
  verifies: z.array(z.string()).default([]),
  checked_at: date,
});

const Image = z
  .object({
    role: z.enum(["front", "back", "lookbook", "editorial_product", "care_label", "detail", "brand_history"]),
    external_url: url.nullable().optional(),
    local_file: z.string().nullable().optional(),
    source_name: z.string().min(1),
    source_url: url,
    rights: z.enum(["owned", "licensed", "permission_granted", "unverified"]),
    rights_holder: z.string().nullable().optional(),
    rights_note: z.string().nullable().optional(),
    license_url: url.nullable().optional(),
    checked_at: date,
  })
  .refine((i) => i.external_url || i.local_file, "external_url 또는 local_file 이 필요합니다")
  .refine((i) => i.rights === "unverified" || (i.rights_note && i.rights_note.length > 5), "권한이 확인된 이미지는 rights_note(허가 근거)가 필요합니다")
  .refine((i) => !i.local_file || i.rights !== "unverified", "권한 미확인 이미지는 업로드하지 않습니다");

const Listing = z
  .object({
    source_name: z.string().min(1),
    source_url: url,
    listing_url: url.nullable().optional(),
    price: z.number().int().nonnegative(),
    currency: z.string().default("KRW"),
    price_type: z.enum(["asking", "sold"]),
    condition_note: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    listed_at: date.nullable().optional(),
    sold_at: date.nullable().optional(),
    collected_at: date,
  })
  .refine((l) => l.price_type === "asking" || l.sold_at, "실거래(sold)는 sold_at 이 필요합니다");

const Product = z
  .object({
    brand: z.string().default("UNIQLO"),
    product_code: z.string().nullable().optional(),
    name: z.string().min(1),
    name_ko: z.string().nullable().optional(),
    collection: z.string().nullable().optional(),
    release_year: z.number().int().min(1984).max(2100).nullable().optional(),
    release_season: z.enum(["S/S", "F/W", "ALL"]).nullable().optional(),
    category: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    material: z.string().nullable().optional(),
    fit: z.string().nullable().optional(),
    design_features: z.array(z.string()).default([]),
    description: z.string().nullable().optional(),
    is_collaboration: z.boolean().nullable().optional(),
    collab_partner: z.string().nullable().optional(),
    limited_edition: z.boolean().nullable().optional(),
    discontinued: z.boolean().nullable().optional(),
    production_scale: z.enum(["limited", "small", "standard", "mass"]).nullable().optional(),
    production_note: z.string().nullable().optional(),
    primary_source_url: url,
    verification_note: z.string().nullable().optional(),
    sources: z.array(Source).min(1, "출처가 1개 이상 필요합니다"),
    images: z.array(Image).default([]),
    listings: z.array(Listing).default([]),
  })
  .refine((p) => p.is_collaboration !== true || p.collab_partner, "협업 제품은 collab_partner 가 필요합니다")
  .refine((p) => !p.production_scale || p.production_note, "생산 규모에는 근거(production_note)가 필요합니다")
  .refine((p) => p.sources.some((s) => s.url === p.primary_source_url), "primary_source_url 은 sources 목록에도 있어야 합니다");

const File = z.object({ registered_by: z.string().min(1), products: z.array(Product).min(1) });

const [, , file, ...flags] = process.argv;
const dry = flags.includes("--dry-run");
if (!file) {
  console.error("사용법: node --env-file=.env.local scripts/register-product.mjs <file.json> [--dry-run]");
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
if (PLACEHOLDER.test(raw)) {
  console.error("템플릿 문구가 남아 있습니다. 실제로 확인한 값으로 바꾸거나 null 로 비운 뒤 다시 실행하세요.");
  process.exit(1);
}
const parsed = File.safeParse(JSON.parse(raw));
if (!parsed.success) {
  console.error("검증 실패 — 등록하지 않았습니다.\n");
  for (const issue of parsed.error.issues) console.error(` · ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}
const input = parsed.data;
console.log(`검증 통과: 상품 ${input.products.length}건`);
if (dry) {
  for (const p of input.products) console.log(` · ${p.name} (출처 ${p.sources.length} · 이미지 ${p.images.length} · 시세 ${p.listings.length})`);
  console.log("--dry-run: DB에 쓰지 않았습니다.");
  process.exit(0);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.local).");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const baseDir = path.dirname(path.resolve(file));

for (const p of input.products) {
  const { sources, images, listings, ...row } = p;
  const dup = await sb.from("products").select("id").eq("name", row.name).eq("collection", row.collection ?? "").maybeSingle();
  if (dup.data) {
    console.log(`건너뜀 (이미 등록됨): ${row.name} → ${dup.data.id}`);
    continue;
  }
  const { data: prod, error } = await sb.from("products").insert({ ...row, registered_by: input.registered_by }).select("id").single();
  if (error) throw error;

  if (sources.length) {
    const { error: e } = await sb.from("product_sources").insert(sources.map((s) => ({ ...s, product_id: prod.id })));
    if (e) throw e;
  }
  for (const img of images) {
    let storage_path = null;
    if (img.local_file) {
      const buf = fs.readFileSync(path.resolve(baseDir, img.local_file));
      storage_path = `${prod.id}/${path.basename(img.local_file)}`;
      const { error: up } = await sb.storage.from("product-images").upload(storage_path, buf, { upsert: true, contentType: "image/jpeg" });
      if (up) throw up;
    }
    const { local_file: _ignored, ...rest } = img;
    void _ignored;
    const { error: e } = await sb.from("product_images").insert({ ...rest, storage_path, product_id: prod.id });
    if (e) throw e;
  }
  if (listings.length) {
    const { error: e } = await sb.from("market_listings").insert(listings.map((l) => ({ ...l, product_id: prod.id })));
    if (e) throw e;
  }
  console.log(`등록 완료: ${row.name} → ${prod.id}`);
}
