"use client";

import { idb } from "@/lib/idb";
import type { ScanSession } from "./session";

export async function saveSession(s: ScanSession) {
  await idb.set("scan_sessions", s.id, { ...s, updatedAt: new Date().toISOString() });
}

export function getSession(id: string) {
  return idb.get<ScanSession>("scan_sessions", id);
}

export async function listSessions(): Promise<ScanSession[]> {
  const keys = await idb.keys("scan_sessions");
  const all = await Promise.all(keys.map((k) => idb.get<ScanSession>("scan_sessions", String(k))));
  return all.filter((s): s is ScanSession => Boolean(s?.record)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveBlob(imageId: string, blob: Blob) {
  return idb.set("scan_blobs", imageId, blob);
}

export function getBlob(imageId: string) {
  return idb.get<Blob>("scan_blobs", imageId);
}

/** 세션과 사진을 이 기기에서 삭제 */
export async function deleteSession(s: ScanSession) {
  await Promise.all(s.images.map((i) => idb.del("scan_blobs", i.id)));
  await idb.del("scan_sessions", s.id);
}
