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

/** 플립 인증서에 표시할 데이터 — 검증 완료 제품에서만 만들어진다 */
export interface CertificateData {
  productId: string;
  certNo: string;
  /** 인증번호 끝자리 일련번호 (앞면 표기용) */
  serial: string;
  productName: string;
  productNameKo: string;
  season: string;
  seasonEstimated: boolean;
  collection: string;
  rarityGrade: RarityGrade;
  rarityLabel: string;
  verifiedAt: string;
  items: { label: string; detail: string; passed: boolean }[];
  garment: GarmentSpec;
  detailHref: string;
  /** 실제 인증 시스템 연동 전까지 항상 true */
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

export interface ClosetEntry {
  id: string;
  productId: string;
  ownership: Ownership;
  addedAt: string;
  conditionLabel: string;
  selling: boolean;
  askingPrice?: number;
  place?: string;
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

export type ScanSlotKey = "front" | "back" | "label" | "damage";

export interface ScanStep {
  key: string;
  label: string;
  doneLabel: string;
}

export interface ScanResult {
  productId: string;
  confidence: number;
  condition: { label: string; notes: string[] };
  isDemo: true;
}
