"use client";

import { SCAN_BUCKET, ensureAnonymousUser, getSupabase } from "@/lib/supabase/client";
import { getBlob } from "@/lib/scan/session-store";
import type { ScanSession } from "@/lib/scan/session";

/**
 * 촬영 세션을 Supabase 에 저장한다 — 사용자가 '사진 저장'에 동의한 경우에만 호출된다.
 * 분석에 실제로 쓴(채택된) 사진만 올리고, 재촬영으로 버린 사진은 올리지 않는다.
 * 저장 위치: scan-images/{auth.uid}/{session_id}/{image_id}.jpg (비공개 버킷, 본인만 접근)
 */
export async function uploadSession(session: ScanSession): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!session.consent.storage) return { ok: false, error: "저장 동의가 없어 업로드하지 않았습니다." };
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase가 연결되지 않아 이 기기에만 저장했습니다." };
  if (!session.record || !session.analysis) return { ok: false, error: "분석이 끝나지 않은 세션입니다." };

  try {
    const user = await ensureAnonymousUser(sb);
    const used = session.flow.steps.filter((s) => s.acceptedImageId);

    const { error: e1 } = await sb.from("scan_sessions").insert({
      id: session.id,
      user_id: user.id,
      status: "completed",
      consent_analysis: session.consent.analysis,
      consent_storage: true,
      consent_at: session.consent.at,
      model: session.model,
      client_version: "web-1",
    });
    if (e1) throw e1;

    for (const step of used) {
      const imageId = step.acceptedImageId as string;
      const meta = session.images.find((i) => i.id === imageId);
      const blob = await getBlob(imageId);
      if (!blob || !meta) continue;
      const path = `${user.id}/${session.id}/${imageId}.jpg`;
      const { error: up } = await sb.storage.from(SCAN_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up) throw up;
      const { error: e2 } = await sb.from("scan_images").insert({
        id: imageId,
        session_id: session.id,
        user_id: user.id,
        step_target: step.target,
        step_kind: step.kind,
        storage_path: path,
        width: meta.width,
        height: meta.height,
        blur_score: meta.blurScore,
      });
      if (e2) throw e2;
      if (meta.review) {
        const { error: e3 } = await sb.from("scan_observations").insert({
          session_id: session.id,
          image_id: imageId,
          user_id: user.id,
          kind: "shot_review",
          model: session.model,
          payload: meta.review,
        });
        if (e3) throw e3;
      }
    }

    const { error: e4 } = await sb.from("scan_observations").insert({
      session_id: session.id,
      user_id: user.id,
      kind: "garment_analysis",
      model: session.model,
      payload: session.analysis,
    });
    if (e4) throw e4;

    const level = session.record.verification.level === "archive_matched" ? "archive_matched" : "ai_analyzed";
    const { error: e5 } = await sb.from("archive_results").insert({
      session_id: session.id,
      user_id: user.id,
      product_id: session.match?.status === "confirmed" ? session.match.productId : null,
      match_status: session.match?.status ?? "unconfirmed",
      match_method: session.match?.method ?? null,
      verification_level: level,
      // 사진 blob URL 은 기기 전용이므로 비워서 저장한다
      record: { ...session.record, images: session.record.images.map((i) => (i.rights === "own_capture" ? { ...i, src: null } : i)) },
    });
    if (e5) throw e5;
    return { ok: true };
  } catch (err) {
    const msg = (err as { message?: string })?.message ?? String(err);
    return { ok: false, error: `서버 저장 실패: ${msg}` };
  }
}
