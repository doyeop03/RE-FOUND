"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 브라우저 클라이언트.
 * - 브라우저에는 공개용(anon / publishable) 키만 둔다. 모든 테이블은 RLS 로 보호한다.
 * - 상품 DB 쓰기(products 등)는 RLS 정책이 없어 브라우저에서 불가능하다 → scripts/register-product.mjs (service role) 로만 등록.
 * - 스캔 기록 업로드는 익명 로그인(auth.uid) 소유로 저장되며, 사용자가 저장에 동의한 경우에만 실행된다.
 */

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfigured() {
  return Boolean(URL_ && KEY);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createClient(URL_ as string, KEY as string, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "refound-auth" },
    });
  }
  return client;
}

/** 업로드 전에만 호출 — Supabase Auth 의 Anonymous sign-ins 가 켜져 있어야 한다 */
export async function ensureAnonymousUser(sb: SupabaseClient) {
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error || !signed.user) throw new Error(`익명 로그인 실패: ${error?.message ?? "unknown"}`);
  return signed.user;
}

export const SCAN_BUCKET = "scan-images";
export const PRODUCT_BUCKET = "product-images";
