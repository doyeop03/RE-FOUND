/**
 * RE:FOUND 도메인 타입.
 * 향후 FastAPI / Firestore 스키마와 1:1로 맞추기 쉽도록 UI와 분리해 둔다.
 */

export type Category = "outer" | "fleece" | "knit" | "shirt" | "tee" | "pants";

export type RarityGrade = "S" | "A" | "B" | "C";

export type EvalKey = "era" | "scarcity" | "design" | "demand" | "condition";

export type Fabric = "fleece" | "wool" | "denim" | "cotton" | "knit" | "nylon";

export type GarmentView = "front" | "back" | "label" | "detail";

/** 로컬 SVG 일러스트를 그리기 위한 스펙 (실제 제품 사진으로 교체 예정) */
export interface GarmentSpec {
  kind: "top" | "pants";
  color: string;
  accent?: string;
  fabric: Fabric;
  length?: "short" | "regular" | "long";
  sleeve?: "long" | "short";
  collar?: "stand" | "shirt" | "crew" | "lapel";
  front?: "zip" | "halfzip" | "buttons" | "none";
  pockets?: "chest" | "flap4" | "flap2" | "welt" | "none";
  ribHem?: boolean;
  graphic?: "box" | "circle" | "stripe";
}

export interface Season {
  year: number;
  term: "S/S" | "F/W";
  /** 공식 자료로 확인되지 않은 추정값 여부 */
  estimated: boolean;
  /** 표시용 시즌 문구 (예: 2000s, 1994 S/S(시연용 가정)) — 있으면 연도 · 시즌 대신 그대로 보여 준다 */
  label?: string;
}

export type ProductionScale = "limited" | "small" | "standard" | "mass";

/** 희귀도 등급 산정에만 쓰이는 희소성 지표 (상태·수요와 분리) */
export interface ScarcityIndicators {
  productionScale: ProductionScale;
  productionNote: string;
  discontinued: boolean;
  reissued: boolean;
  activeListings: number;
}

export interface RarityFactor {
  key: "age" | "production" | "discontinued" | "listings";
  label: string;
  value: string;
  points: number;
  max: number;
}

export interface RarityResult {
  grade: RarityGrade;
  score: number;
  factors: RarityFactor[];
}

export interface MarketPoint {
  month: string;
  low: number;
  median: number;
  high: number;
}

export interface MarketData {
  /** 중고 매물 호가 기준 (실거래가 아님) */
  low: number;
  high: number;
  listings: number;
  asOf: string;
  trend: MarketPoint[];
}

export interface StorySection {
  label: string;
  title: string;
  body: string;
}

export interface ArchiveStory {
  kicker: string;
  headline: string;
  sections: StorySection[];
}

export interface Provenance {
  source: string;
  status: "demo" | "community" | "verified";
  note: string;
}

export interface ProductBase {
  id: string;
  name: string;
  /** 발견하기 카드 위쪽의 분류 라벨 (예: FLEECE, DENIM) — 없으면 컬렉션명 */
  cardLabel?: string;
  nameKo: string;
  category: Category;
  collection: string;
  collab: { partner: string; note: string } | null;
  season: Season;
  material: string;
  fit: string;
  color: { name: string; others?: string };
  garment: GarmentSpec;
  description: string;
  archiveType: { label: string; en: string; desc: string };
  evaluation: Record<EvalKey, { score: number; reason: string }>;
  scarcity: ScarcityIndicators;
  condition: { label: string; notes: string[] };
  market: MarketData | null;
  story: ArchiveStory;
  provenance: Provenance;
  registeredAt: string;
  foundThisWeek?: boolean;
}

export interface Product extends ProductBase {
  rarity: RarityResult;
  verification: Verification | null;
}

/* ───────── 아카이브 인증 (RE:FOUND 자체 검증) ───────── */

/** verified: 검증 완료 · in_review: 검증 진행 중 · needs_review: 추가 확인 필요 */
export type VerificationStatus = "verified" | "in_review" | "needs_review";

export type VerificationCheckKey =
  | "label"
  | "season"
  | "material"
  | "hardware"
  | "condition";

/** pass: 통과 · pending: 검수 대기 · flag: 추가 확인 필요 */
export type CheckResult = "pass" | "pending" | "flag";

export interface VerificationCheck {
  key: VerificationCheckKey;
  label: string;
  detail: string;
  result: CheckResult;
}

export interface Verification {
  productId: string;
  status: VerificationStatus;
  /** 검증 완료 시에만 발급된다 */
  certNo: string | null;
  /** 검증 접수 번호 — 상태와 관계없이 항상 존재 */
  requestNo: string;
  requestedAt: string;
  /** 검증 완료일 (완료 전에는 null) */
  verifiedAt: string | null;
  /** 진행 중일 때 예상 완료일 */
  expectedAt?: string;
  checks: VerificationCheck[];
  /** 추가 확인이 필요할 때 사용자에게 보여 줄 안내 */
  note?: string;
}

/**
 * 플립 인증서에 표시할 데이터.
 * level 이 "verified" 일 때만 '검증 완료' 인증서이며, 나머지 단계는 정품 인증이 아님을 카드에 함께 표기한다.
 *  - ai_analyzed: AI 촬영 분석 완료 기록
 *  - archive_matched: 출처가 있는 상품 정보와 대조됨
 *  - verified: RE:FOUND 별도 검수 통과
 */
export interface CertificateData {
  level: "ai_analyzed" | "archive_matched" | "verified";
  productId: string;
  certNo: string;
  /** 인증번호 끝자리 일련번호 (앞면 표기용) */
  serial: string;
  /** "검증 번호" | "기록 번호" */
  numberLabel: string;
  productName: string;
  productNameKo: string;
  season: string;
  seasonEstimated: boolean;
  collection: string;
  /** 판정 자료가 부족하면 null */
  rarityGrade: RarityGrade | null;
  rarityLabel: string;
  /** 빈티지 유형 (Figma 인증서 뒷면) — 정하지 못했으면 null → 희귀도 칸을 대신 보여 준다 */
  vintageType?: string | null;
  verifiedAt: string;
  /** "검증일" | "확인일" | "분석일" */
  dateLabel: string;
  items: { label: string; detail: string; passed: boolean }[];
  /** 데모 제품의 일러스트 스펙 */
  garment?: GarmentSpec;
  /** 실제 레코드의 대표 사진 (권한 확인된 사진만) */
  photoUrl?: string | null;
  detailHref: string;
  /** 데모 데이터 여부 */
  isDemo: boolean;
}

export interface CareGuide {
  material: string[];
  washing: string[];
  storage: string[];
  tips: string[];
}

/** 매거진 본문 블록 — 향후 LLM이 이 구조의 JSON을 생성한다 */
export type EditorialBlock =
  | { type: "lead"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "product"; productId: string; caption: string };

export interface Editorial {
  slug: string;
  issue: string;
  title: string;
  subtitle: string;
  summary: string;
  readMinutes: number;
  coverProductId: string;
  tone: "light" | "dark" | "red";
  blocks: EditorialBlock[];
  relatedProductIds: string[];
  generatedBy: "editor-demo" | "llm";
}

export interface Shop {
  id: string;
  name: string;
  area: string;
  address: string;
  distanceKm: number;
  hours: string;
  closed: string;
  description: string;
  tags: string[];
  map: { x: number; y: number };
  foundProductIds: string[];
  partner: boolean;
}

export type Ownership = "found" | "owned";

/* ───────── 판매 · 구매 (Figma 09 ~ 12) ───────── */

/** parcel: 택배 배송 · direct: 직거래 */
export type DealMethod = "parcel" | "direct";

/** 판매자가 직접 적는 거래 정보 — 제품 설명 · 스타일 자료는 공통 아카이브 콘텐츠를 쓴다 */
export interface ListingTerms {
  size: string;
  method: DealMethod;
  /** 배송 조건 안내 (예: 배송비 3,000원 · 결제 후 2일 이내 발송) */
  shipping: string;
  shippingFee: number;
  /** 추가 하자 · 전달 사항 */
  note?: string;
}

export interface Listing extends ListingTerms {
  productId: string;
  price: number;
  conditionLabel: string;
  /** 판매 상품의 상태 요약 (예: 소매 끝에 가벼운 보풀) */
  conditionNote: string;
  seller: string;
  status: "on_sale" | "sold_out";
  /** 이 기기에서 내가 등록한 판매 */
  mine: boolean;
}

export interface ClosetEntry {
  id: string;
  productId: string;
  ownership: Ownership;
  addedAt: string;
  conditionLabel: string;
  selling: boolean;
  askingPrice?: number;
  place?: string;
  /** 판매 정보 작성(Figma 10)에서 적은 거래 조건 */
  listing?: ListingTerms;
}

export type ActivityType =
  | "scan"
  | "save"
  | "like"
  | "cleaning"
  | "repair"
  | "resale"
  | "wear";

export interface Activity {
  id: string;
  type: ActivityType;
  productId: string;
  message: string;
  at: string;
}

export type ServiceType = "cleaning" | "repair" | "resale";

/* 스캔 관련 타입은 src/lib/scan/* (실제 촬영 · AI 분석) 와 src/types/archive-record.ts 에 있다 */
