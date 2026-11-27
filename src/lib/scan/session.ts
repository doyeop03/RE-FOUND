import type { ArchiveRecord, MatchSummary } from "@/types/archive-record";
import type { DbProduct } from "@/services/product-db";
import type { ScanProduct } from "./curation";
import type { FlowState } from "./flow";
import type { GarmentAnalysis, ShotReview, Target } from "./schemas";

/** 촬영 세션 — 이 기기(IndexedDB)에 저장되며, 저장 동의 시에만 Supabase 로 업로드된다 */

export interface ScanImageMeta {
  id: string;
  stepId: string;
  target: Target;
  createdAt: string;
  width: number;
  height: number;
  blurScore: number;
  brightness: number;
  source: "camera" | "gallery";
  review: ShotReview | null;
  decision: "accept" | "retake" | "unreviewed" | "pending";
  /** 기기 판정에서 흐림/어두움으로 걸렸지만 사용자가 그대로 쓴 경우 */
  qualityOverride?: boolean;
}

export interface ScanSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  consent: { analysis: boolean; storage: boolean; at: string };
  model: string;
  flow: FlowState;
  images: ScanImageMeta[];
  analysis: GarmentAnalysis | null;
  match: MatchSummary | null;
  product: DbProduct | null;
  record: ArchiveRecord | null;
  /** AI 큐레이션 결과 (프로토타입: 유니클로 상품 DB 역할) — 있으면 Figma 05 레이아웃으로 보여 준다 */
  curated?: ScanProduct | null;
  /** '시연 사진으로 진행'으로 만든 세션 */
  demo?: boolean;
  /** 나의 옷장에 자동으로 넣었는지 — 사용자가 옷장에서 지운 뒤 다시 들어가지 않도록 */
  closetAdded?: boolean;
  remote: { status: "skipped" | "uploaded" | "failed"; at?: string; error?: string } | null;
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
