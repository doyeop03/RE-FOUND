/**
 * 실제 데이터 기반 아카이브 레코드 타입.
 *
 * Mock 제품(`Product`, src/data/products.ts)과 섞이지 않도록 완전히 별도의 타입으로 둔다.
 * - kind "seed": 출처가 확인된 외부 자료(archive_seed.json)로 만든 레코드
 * - kind "scan": 사용자가 실제로 촬영한 사진 + Gemini 분석 + 상품 DB 조회로 만든 레코드
 *
 * 모든 값은 "누가, 무엇을 근거로" 말했는지를 함께 들고 다닌다(Fact).
 * 근거가 없으면 value 는 null 이고 status 는 "unknown" 이다. 화면은 null 을 "정보 없음"으로 보여 준다.
 */

import type { RarityGrade } from "@/types";

/** verified: 공식·1차 자료로 확인 · claimed: 판매자/제3자 표기(미확인) · observed: AI가 사진에서 관찰 · unknown: 확인 불가 */
export type FactStatus = "verified" | "claimed" | "observed" | "unknown";

export type FactBasis =
  | "official" // 브랜드 공식 자료
  | "press" // 언론 · 매거진 기사
  | "seller_listing" // 중고 판매처 표기
  | "product_db" // RE:FOUND 상품 DB (등록 시 출처 URL 필수)
  | "ai_observation" // Gemini 이미지 분석
  | "user" // 사용자가 직접 입력
  | "none";

export interface Fact<T> {
  value: T | null;
  status: FactStatus;
  basis: FactBasis;
  sourceIds?: string[];
  /** AI 관찰의 근거가 된 촬영 이미지 id */
  evidenceImageIds?: string[];
  note?: string;
}

export type ImageRole =
  | "front"
  | "back"
  | "angled_front"
  | "sleeve"
  | "shoulder"
  | "collar"
  | "collar_label"
  | "care_label"
  | "zipper"
  | "fabric"
  | "detail"
  | "lookbook"
  | "editorial_product"
  | "brand_history";

/**
 * own_capture: 사용자가 이 기기에서 직접 촬영 · user_registered: 사용자가 이미지 등록 영역에 직접 올림
 * licensed: 사용 허가가 기록된 이미지 · unverified: 출처는 있으나 공개 사용 권한 미확인 (화면에 표시하지 않음)
 */
export type ImageRights = "own_capture" | "user_registered" | "licensed" | "unverified";

/** same_item: 같은 실물 · same_collection: 같은 컬렉션 자료 · brand_archive: 브랜드 일반 자료(이 제품 아님) */
export type ImageRelation = "same_item" | "same_collection" | "brand_archive" | "user_capture";

export interface RecordImage {
  id: string;
  role: ImageRole;
  label: string;
  /** 화면에 표시해도 되는 URL. 권한이 없거나 아직 로드 전이면 null */
  src: string | null;
  /** 권한 미확인 외부 이미지의 원본 주소 — 렌더링하지 않고 출처 확인용으로만 보관 */
  originalUrl?: string;
  rights: ImageRights;
  rightsNote?: string;
  sourceId?: string;
  sourceLabel: string;
  relation: ImageRelation;
  era: "then" | "now";
  caption?: string;
  /** 링크 상태 점검 기록 */
  checked?: { at: string; httpStatus: number | null };
}

export type SourceKind =
  | "official_collection"
  | "official_history"
  | "press"
  | "magazine_retrospective"
  | "used_item_listing"
  | "product_db"
  | "ai_model";

export interface RecordSource {
  id: string;
  kind: SourceKind;
  label: string;
  publisher: string;
  url: string | null;
  date?: string | null;
  /** 이 출처로 확인한 내용 (직접 원문에서 확인한 것만) */
  verifies: string[];
  /** product: 이 제품 자체 · collection: 같은 컬렉션 · brand: 브랜드 일반 · item_listing: 같은 실물 판매글 */
  scope: "product" | "collection" | "brand" | "item_listing";
  checkedAt?: string | null;
}

export type VerificationLevel = "none" | "ai_analyzed" | "archive_matched" | "verified";

export type ConditionKey = "pilling" | "stains" | "wear" | "discoloration" | "tears" | "zipper";

/** AI는 손상을 '확정'하지 않는다 — suspected(의심) / not_observed(사진상 발견되지 않음) / unknown(확인되지 않음) */
export type ConditionStatus = "suspected" | "not_observed" | "unknown" | "not_applicable";

export interface ConditionItem {
  key: ConditionKey;
  label: string;
  status: ConditionStatus;
  locations: string[];
  evidenceImageIds: string[];
  note?: string | null;
}

export interface RarityFactorRecord {
  key: "age" | "discontinued" | "collab" | "production" | "listings" | "demand";
  label: string;
  value: string | null;
  available: boolean;
  points: number | null;
  max: number;
  note?: string;
}

export interface RecordRarity {
  status: "graded" | "insufficient";
  grade: RarityGrade | null;
  score: number | null;
  /** 반영된 항목 최대점 합 — 부족한 항목은 분모에서도 빠진다 */
  maxScore: number | null;
  factors: RarityFactorRecord[];
  note: string;
}

export interface PriceStats {
  count: number;
  low: number;
  high: number;
  median: number;
}

export interface RecordMarket {
  currency: string;
  /** 판매 희망가(호가) */
  asking: PriceStats | null;
  /** 실거래가 */
  sold: PriceStats | null;
  sources: string[];
  collectedFrom: string | null;
  collectedTo: string | null;
}

export interface DescriptionLine {
  text: string;
  basis: FactBasis;
  sourceIds?: string[];
}

export interface StoryBlock {
  title?: string;
  body: string;
  /** product/collection 이면 이 제품과 직접 관련된 자료, brand 면 브랜드 일반 역사(이 제품의 이력 아님) */
  scope: "product" | "collection" | "brand";
  sourceIds: string[];
  generatedBy?: "editor" | "gemini";
}

/** 앞 6개는 DESIGN IN DETAIL 의 기본 칸, 나머지는 자료가 있을 때만 추가되는 칸 */
export type DetailSlotKey = "front" | "back" | "sleeve" | "zipper" | "label" | "fabric" | "angle" | "shoulder" | "extra";

export interface EditorialDetail {
  slot: DetailSlotKey;
  label: string;
  imageId: string | null;
  caption: string;
}

export interface EditorialData {
  title: string | null;
  subtitle: string | null;
  lookbook: { imageId: string | null; season: string | null; note: string };
  story: StoryBlock[];
  details: EditorialDetail[];
  then: string[];
  now: string[];
}

export interface VerificationStage {
  key: Exclude<VerificationLevel, "none">;
  label: string;
  done: boolean;
  detail: string;
}

export interface RecordVerification {
  level: VerificationLevel;
  recordNo: string;
  date: string | null;
  stages: VerificationStage[];
  note: string;
}

export interface VintageTypeResult {
  label: string;
  en: string;
  desc: string;
  reason: string;
}

export interface ArchiveRecord {
  id: string;
  kind: "seed" | "scan";
  href: string;
  displayName: string;
  displayNameKo: string | null;
  brand: string;
  collection: Fact<string>;
  releaseYear: Fact<number>;
  releaseSeason: Fact<string>;
  eraClaim: Fact<string>;
  productCode: Fact<string>;
  category: Fact<string>;
  material: Fact<string>;
  fit: Fact<string>;
  color: Fact<string>;
  silhouette: Fact<string>;
  designFeatures: Fact<string[]>;
  sizeOnLabel: Fact<string>;
  historicPrice: Fact<string>;
  washing: Fact<string[]>;
  description: DescriptionLine[];
  vintageType: VintageTypeResult | null;
  vintageTypeNote: string;
  /** null: 실물 상태를 기록한 자료가 없음 */
  condition: ConditionItem[] | null;
  additionalChecks: { target: string; reason: string }[];
  rarity: RecordRarity;
  market: RecordMarket | null;
  verification: RecordVerification;
  images: RecordImage[];
  sources: RecordSource[];
  editorial: EditorialData;
  /** 상품 DB 조회 상태 (scan 전용) */
  match?: MatchSummary;
  createdAt: string;
}

export type MatchStatus =
  | "confirmed" // 사용자가 후보를 확인함
  | "unconfirmed" // 후보가 없거나 사용자가 '해당 없음'을 고름 → 제품 미확인
  | "db_unavailable"; // 상품 DB가 연결되지 않아 조회 불가

export interface MatchSummary {
  status: MatchStatus;
  method: "product_code" | "attributes" | "manual" | null;
  productId: string | null;
  recognizedCode: string | null;
  crossChecks: { field: string; db: string | null; observed: string | null; result: "match" | "mismatch" | "unknown" }[];
  note: string;
}
