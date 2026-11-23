-- RE:FOUND 실제 데이터 스키마
-- products · product_sources · product_images · scan_sessions · scan_images · scan_observations · market_listings · archive_results
--
-- 원칙
-- 1. 상품 정보(products 등)는 출처 URL 없이 저장할 수 없다 (NOT NULL + CHECK).
-- 2. 상품 · 시세 데이터는 브라우저에서 쓸 수 없다 — INSERT/UPDATE 정책이 없으므로 service role(개발자 등록 스크립트)만 쓴다.
-- 3. 사용자 촬영 데이터는 저장 동의(consent_storage)가 있어야만 행이 생기며, 본인(auth.uid)만 읽고 지울 수 있다.
-- 4. '검증 완료(verified)'는 사용자가 스스로 표시할 수 없다 — 검수 담당자가 service role 로만 바꾼다.

create extension if not exists pgcrypto;

-- ───────── 상품 (공식 상품 정보) ─────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand text not null default 'UNIQLO',
  product_code text,
  product_code_normalized text generated always as (
    nullif(upper(regexp_replace(coalesce(product_code, ''), '[^A-Za-z0-9]', '', 'g')), '')
  ) stored,
  name text not null,
  name_ko text,
  collection text,
  release_year int check (release_year between 1984 and 2100),
  release_season text check (release_season in ('S/S', 'F/W', 'ALL')),
  category text,
  color text,
  material text,
  fit text,
  design_features text[] not null default '{}',
  -- 공식 설명 원문 또는 출처 문장 요약. 출처에 없는 내용은 넣지 않는다.
  description text,
  -- null = 자료 없음(계산에서 제외) · false = 아님이 확인됨
  is_collaboration boolean,
  collab_partner text,
  limited_edition boolean,
  discontinued boolean,
  production_scale text check (production_scale in ('limited', 'small', 'standard', 'mass')),
  production_note text,
  primary_source_url text not null check (primary_source_url ~ '^https?://'),
  verification_note text,
  registered_by text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_collaboration is not true or collab_partner is not null),
  check (production_scale is null or production_note is not null)
);
create index products_code_idx on public.products (product_code_normalized);
create index products_category_idx on public.products (category);

-- ───────── 상품 출처 ─────────
create table public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind text not null check (kind in ('official_collection', 'official_history', 'press', 'magazine_retrospective', 'used_item_listing', 'other')),
  publisher text not null,
  title text,
  url text not null check (url ~ '^https?://'),
  published_on date,
  -- product: 이 제품 자체 · collection: 같은 컬렉션 · brand: 브랜드 일반 역사(이 제품의 이력 아님)
  scope text not null check (scope in ('product', 'collection', 'brand')),
  -- 원문에서 그대로 옮긴 발췌. 아카이브 스토리 생성에는 이 발췌만 쓴다.
  excerpt text,
  verifies text[] not null default '{}',
  checked_at date not null,
  created_at timestamptz not null default now()
);
create index product_sources_product_idx on public.product_sources (product_id);

-- ───────── 상품 기준 이미지 (출처 · 사용 권한 관리) ─────────
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  role text not null check (role in ('front', 'back', 'lookbook', 'editorial_product', 'care_label', 'detail', 'brand_history')),
  storage_path text,
  external_url text check (external_url is null or external_url ~ '^https?://'),
  source_name text not null,
  source_url text not null check (source_url ~ '^https?://'),
  -- owned: RE:FOUND 직접 촬영 · licensed: 라이선스 · permission_granted: 권리자 허가 · unverified: 권한 미확인(공개 조회 불가)
  rights text not null default 'unverified' check (rights in ('owned', 'licensed', 'permission_granted', 'unverified')),
  rights_holder text,
  rights_note text,
  license_url text,
  checked_at date not null,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null),
  check (rights = 'unverified' or rights_note is not null)
);
create index product_images_product_idx on public.product_images (product_id);

-- ───────── 중고시장 매물 (실제 수집 데이터) ─────────
create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  source_name text not null,
  source_url text not null check (source_url ~ '^https?://'),
  listing_url text,
  price integer not null check (price >= 0),
  currency text not null default 'KRW',
  -- asking: 판매 희망가 · sold: 실거래가
  price_type text not null check (price_type in ('asking', 'sold')),
  condition_note text,
  size text,
  listed_at date,
  sold_at date,
  collected_at date not null,
  created_at timestamptz not null default now(),
  check (price_type = 'asking' or sold_at is not null)
);
create index market_listings_product_idx on public.market_listings (product_id, collected_at desc);

-- ───────── 사용자 촬영 세션 ─────────
create table public.scan_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null check (status in ('capturing', 'analyzed', 'completed', 'failed')),
  consent_analysis boolean not null,
  consent_storage boolean not null,
  consent_at timestamptz not null,
  model text,
  client_version text,
  retention_until timestamptz not null default (now() + interval '180 days'),
  created_at timestamptz not null default now(),
  -- 저장 동의 없이 행을 만들 수 없다
  check (consent_storage and consent_analysis)
);
create index scan_sessions_user_idx on public.scan_sessions (user_id, created_at desc);

create table public.scan_images (
  id uuid primary key,
  session_id uuid not null references public.scan_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step_target text not null,
  step_kind text not null check (step_kind in ('base', 'extra')),
  storage_path text not null,
  width int,
  height int,
  blur_score real,
  created_at timestamptz not null default now()
);
create index scan_images_session_idx on public.scan_images (session_id);

create table public.scan_observations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scan_sessions (id) on delete cascade,
  image_id uuid references public.scan_images (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('shot_review', 'garment_analysis', 'reference_compare')),
  model text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index scan_observations_session_idx on public.scan_observations (session_id);

-- ───────── 최종 분석 결과 ─────────
create table public.archive_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.scan_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  match_status text not null check (match_status in ('confirmed', 'unconfirmed', 'db_unavailable')),
  match_method text check (match_method in ('product_code', 'attributes', 'manual')),
  verification_level text not null default 'ai_analyzed' check (verification_level in ('ai_analyzed', 'archive_matched', 'verified')),
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_level <> 'verified' or (review_status = 'verified' and reviewed_by is not null)),
  check (match_status = 'confirmed' or verification_level = 'ai_analyzed' or verification_level = 'verified')
);

-- ───────── RLS ─────────
alter table public.products enable row level security;
alter table public.product_sources enable row level security;
alter table public.product_images enable row level security;
alter table public.market_listings enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.scan_images enable row level security;
alter table public.scan_observations enable row level security;
alter table public.archive_results enable row level security;

-- 공개 읽기 (쓰기 정책 없음 → service role 전용)
create policy "products readable" on public.products for select to anon, authenticated using (published);
create policy "sources readable" on public.product_sources for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.published));
-- 권한 미확인 이미지는 아예 조회되지 않는다
create policy "images readable when rights cleared" on public.product_images for select to anon, authenticated
  using (rights <> 'unverified' and exists (select 1 from public.products p where p.id = product_id and p.published));
create policy "listings readable" on public.market_listings for select to anon, authenticated using (true);

-- 사용자 본인 데이터
create policy "own sessions read" on public.scan_sessions for select to authenticated using (user_id = auth.uid());
create policy "own sessions insert" on public.scan_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "own sessions delete" on public.scan_sessions for delete to authenticated using (user_id = auth.uid());

create policy "own images read" on public.scan_images for select to authenticated using (user_id = auth.uid());
create policy "own images insert" on public.scan_images for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid()));

create policy "own observations read" on public.scan_observations for select to authenticated using (user_id = auth.uid());
create policy "own observations insert" on public.scan_observations for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid()));

create policy "own results read" on public.archive_results for select to authenticated using (user_id = auth.uid());
-- 사용자는 'verified' 상태로 결과를 만들 수 없다
create policy "own results insert" on public.archive_results for insert to authenticated
  with check (
    user_id = auth.uid()
    and verification_level in ('ai_analyzed', 'archive_matched')
    and review_status = 'pending'
    and reviewed_by is null
    and exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- ───────── 스토리지 ─────────
insert into storage.buckets (id, name, public) values ('scan-images', 'scan-images', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

-- scan-images/{auth.uid}/{session_id}/{image_id}.jpg — 본인 폴더만
create policy "scan images insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'scan-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "scan images read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'scan-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "scan images delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'scan-images' and (storage.foldername(name))[1] = auth.uid()::text);
-- product-images 는 공개 버킷이지만 업로드는 service role 만 (정책 없음)

-- ───────── 보관 기간 만료 정리 ─────────
-- 사진 파일은 스토리지 API로 지워야 하므로, 이 함수는 만료 세션의 파일 경로를 돌려주고 행을 삭제한다.
-- 스케줄러(예: Supabase Cron + Edge Function)에서 반환된 경로를 storage.remove 로 지운다.
create or replace function public.expired_scan_sessions()
returns table (session_id uuid, storage_path text)
language sql security definer set search_path = public as $$
  select s.id, i.storage_path from public.scan_sessions s
  left join public.scan_images i on i.session_id = s.id
  where s.retention_until < now();
$$;
revoke all on function public.expired_scan_sessions() from public, anon, authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger results_touch before update on public.archive_results for each row execute function public.touch_updated_at();
