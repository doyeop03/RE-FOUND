import {
  buildVerification,
  computeRecordRarity,
  decideVintageType,
  fact,
  soldInLastDays,
  summarizeMarket,
  unknown,
  type ListingRow,
} from "@/lib/archive/record-rules";
import type {
  ArchiveRecord,
  ConditionItem,
  DescriptionLine,
  EditorialDetail,
  Fact,
  ImageRole,
  RecordImage,
  RecordSource,
  StoryBlock,
} from "@/types/archive-record";
import type { DbProduct } from "@/services/product-db";
import { acceptedImages } from "./flow";
import { TARGET_LABEL, type ConditionFieldValue, type GarmentAnalysis, type Target } from "./schemas";
import type { ScanSession } from "./session";

/**
 * 촬영 세션 + Gemini 분석 + (확인된) 상품 DB 정보 → 아카이브 상세 페이지 데이터.
 * 순수 함수 (tests/build-record.test.ts). 근거가 없는 값은 null 로 남긴다.
 */

const ROLE: Partial<Record<Target, ImageRole>> = {
  front_full: "front",
  back_full: "back",
  care_label: "care_label",
  main_tag: "collar_label",
  collar: "collar",
  left_sleeve: "sleeve",
  right_sleeve: "sleeve",
  left_cuff: "sleeve",
  right_cuff: "sleeve",
  zipper: "zipper",
  fabric_closeup: "fabric",
  shoulder: "shoulder",
};

const SLOT_OF: Partial<Record<ImageRole, EditorialDetail["slot"]>> = {
  front: "front",
  back: "back",
  sleeve: "sleeve",
  zipper: "zipper",
  care_label: "label",
  collar_label: "label",
  fabric: "fabric",
  shoulder: "shoulder",
};

const CONCERN_KO: Record<string, string> = {
  pilling: "보풀",
  stain: "얼룩",
  discoloration: "변색",
  tear: "찢어짐",
  wear: "마모",
  zipper_issue: "지퍼 이상",
  label_unreadable: "라벨 판독 어려움",
  other: "기타",
};

export interface BuildInput {
  session: ScanSession;
  analysis: GarmentAnalysis;
  /** 사용자가 확인한 상품만 넣는다 (미확인이면 null) */
  product: DbProduct | null;
  productImageUrls: Record<string, string | null>;
  listings: ListingRow[];
  description: DescriptionLine[];
  story: StoryBlock[];
  now?: Date;
}

function aiFact(o: { value: string | null; status: "observed" | "unknown"; evidence_image_ids: string[] }): Fact<string> {
  return o.value && o.status === "observed"
    ? fact(o.value, "observed", "ai_observation", { evidenceImageIds: o.evidence_image_ids })
    : unknown("사진으로 판단할 수 없음");
}

function preferDb(db: string | null | undefined, sourceIds: string[], ai: Fact<string>): Fact<string> {
  if (db) return fact(db, "verified", "product_db", { sourceIds });
  return ai;
}

function conditionItem(key: ConditionItem["key"], label: string, c: ConditionFieldValue): ConditionItem {
  return { key, label, status: c.status, locations: c.locations, evidenceImageIds: c.evidence_image_ids, note: c.note_ko };
}

export function recordNoFor(sessionId: string, createdAt: string) {
  return `RF-AI-${createdAt.slice(0, 10).replaceAll("-", "")}-${sessionId.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()}`;
}

export function buildScanRecord(input: BuildInput): ArchiveRecord {
  const { session, analysis: a, product: p, listings } = input;
  const now = input.now ?? new Date();
  const g = a.garment;
  const label = a.care_label;

  /* 출처 */
  const sources: RecordSource[] = [
    ...(p?.product_sources ?? []).map((s) => ({
      id: s.id,
      kind: (s.kind as RecordSource["kind"]) ?? "product_db",
      label: s.title ?? s.publisher,
      publisher: s.publisher,
      url: s.url,
      date: s.published_on,
      verifies: s.verifies ?? [],
      scope: s.scope,
      checkedAt: s.checked_at,
    })),
    {
      id: "ai-analysis",
      kind: "ai_model",
      label: `Gemini 이미지 분석 (${session.model})`,
      publisher: "Firebase AI Logic",
      url: null,
      date: session.createdAt.slice(0, 10),
      verifies: [`촬영 사진 ${acceptedImages(session.flow).length}장의 외관 · 케어라벨 관찰 — 확정 판정 아님`],
      scope: "product",
      checkedAt: session.createdAt.slice(0, 10),
    },
  ];
  const productSourceIds = (p?.product_sources ?? []).map((s) => s.id);

  /* 이미지 */
  const userImages: RecordImage[] = acceptedImages(session.flow).map(({ imageId, target, stepId }) => {
    const step = session.flow.steps.find((s) => s.id === stepId);
    const meta = session.images.find((i) => i.id === imageId);
    const concerns = meta?.review?.concerns ?? [];
    const note = concerns.length
      ? `AI: ${concerns.map((c) => `${TARGET_LABEL[c.location]} ${CONCERN_KO[c.type] ?? c.type} 의심`).join(", ")}`
      : meta?.review
        ? "AI 검토: 특이점 표시 없음"
        : "AI 검토를 받지 못한 사진";
    return {
      id: imageId,
      role: ROLE[target] ?? "detail",
      label: step?.title.replace(" 추가 촬영", "") ?? TARGET_LABEL[target],
      src: null,
      rights: "own_capture",
      sourceLabel: "내가 촬영",
      relation: "user_capture",
      era: "now",
      caption: note,
    };
  });

  const refImages: RecordImage[] = (p?.product_images ?? [])
    .filter((im) => input.productImageUrls[im.id])
    .map((im) => ({
      id: im.id,
      role: (im.role as ImageRole) ?? "detail",
      label: im.role === "lookbook" ? "컬렉션 화보" : "공식 기준 이미지",
      src: input.productImageUrls[im.id] ?? null,
      rights: "licensed",
      rightsNote: im.rights_note ?? undefined,
      sourceLabel: im.source_name,
      relation: "same_collection",
      era: "then",
    }));

  /* 사실 */
  const releaseYear = p?.release_year ?? null;
  const vintage = decideVintageType({
    releaseYear,
    collabPartner: !p || p.is_collaboration === null ? undefined : p.is_collaboration ? p.collab_partner ?? "확인됨" : null,
    limitedEdition: p?.limited_edition ?? null,
    now,
  });

  const aiCode = label.product_code.value;
  const productCode: Fact<string> = p?.product_code
    ? fact(p.product_code, "verified", "product_db", { sourceIds: productSourceIds, evidenceImageIds: label.product_code.evidence_image_ids })
    : aiCode
      ? fact(aiCode, "observed", "ai_observation", { evidenceImageIds: label.product_code.evidence_image_ids, note: "케어라벨 인식 값 · 상품 DB와 일치하지 않음" })
      : unknown("케어라벨에서 품번을 읽지 못함");

  const condition: ConditionItem[] = [
    conditionItem("pilling", "보풀", a.condition.pilling),
    conditionItem("stains", "얼룩", a.condition.stains),
    conditionItem("wear", "마모", a.condition.wear),
    conditionItem("discoloration", "변색", a.condition.discoloration),
    conditionItem("tears", "찢어짐", a.condition.tears),
    conditionItem("zipper", "지퍼 (시각 확인)", a.condition.zipper_condition),
  ];

  const additionalChecks = [
    ...a.condition.additional_photos_needed.map((x) => ({ target: TARGET_LABEL[x.target], reason: x.reason_ko })),
    ...session.flow.steps.filter((s) => s.status === "unverified").map((s) => ({ target: s.title, reason: s.reason ?? "확인되지 않음" })),
  ];

  const market = summarizeMarket(listings);
  const asking = market?.asking?.count ?? null;
  const rarity = computeRecordRarity({
    releaseYear,
    discontinued: p?.discontinued ?? null,
    collabPartner: !p || p.is_collaboration === null ? undefined : p.is_collaboration ? p.collab_partner ?? "확인됨" : null,
    productionScale: p?.production_scale ?? null,
    productionNote: p?.production_note,
    // 호가 데이터가 수집된 경우에만 매물 수로 쓴다 (실거래만 있으면 '매물 0건'으로 오해하지 않게 제외)
    activeListings: asking,
    soldLast90Days: soldInLastDays(listings, 90, now),
    now,
  });

  const matched = Boolean(p && session.match?.status === "confirmed" && p.primary_source_url);
  const verification = buildVerification({
    recordNo: recordNoFor(session.id, session.createdAt),
    date: session.createdAt.slice(0, 10),
    aiAnalyzed: { done: true, detail: `Gemini(${session.model})가 사진 ${userImages.length}장을 분석했습니다. 손상은 '의심' 수준으로만 표시합니다.` },
    archiveMatched: matched
      ? { done: true, detail: session.match?.note ?? "상품 DB 일치" }
      : { done: false, detail: session.match?.note ?? "상품 DB와 대조되지 않았습니다." },
    verified: { done: false, detail: "RE:FOUND 검수 담당자의 실물 검수 전입니다." },
  });

  /* 에디토리얼 */
  const lookbook = refImages.find((i) => i.role === "lookbook") ?? null;
  const details: EditorialDetail[] = (["front", "back", "sleeve", "zipper", "label", "fabric"] as const).map((slot) => {
    const im = userImages.find((i) => SLOT_OF[i.role] === slot);
    return {
      slot,
      label: { front: "정면", back: "후면", sleeve: "소매", zipper: "지퍼", label: "라벨", fabric: "원단" }[slot],
      imageId: im?.id ?? null,
      caption: im ? `${im.label} — ${im.caption}` : "이 부위는 촬영하지 않았습니다.",
    };
  });
  userImages
    .filter((i) => !details.some((d) => d.imageId === i.id))
    .forEach((i) => details.push({ slot: "extra", label: i.label, imageId: i.id, caption: i.caption ?? "" }));

  const yearSeason = p?.release_year ? `${p.release_year}${p.release_season ? ` ${p.release_season}` : ""}` : null;

  return {
    id: session.id,
    kind: "scan",
    href: `/archive/scan/?session=${session.id}`,
    displayName: p?.name ?? "제품 미확인",
    displayNameKo: p?.name_ko ?? g.category.value ?? null,
    brand: p?.brand ?? "브랜드 미확인",
    collection: p?.collection ? fact(p.collection, "verified", "product_db", { sourceIds: productSourceIds }) : unknown(),
    releaseYear: releaseYear ? fact(releaseYear, "verified", "product_db", { sourceIds: productSourceIds }) : unknown(p ? "상품 DB에 출시연도 없음" : "제품 미확인"),
    releaseSeason: yearSeason ? fact(yearSeason, "verified", "product_db", { sourceIds: productSourceIds }) : unknown(),
    eraClaim: unknown(),
    productCode,
    category: preferDb(p?.category, productSourceIds, aiFact(g.category)),
    material: preferDb(p?.material, productSourceIds, aiFact(label.material_composition)),
    fit: preferDb(p?.fit, productSourceIds, aiFact(g.fit)),
    color: preferDb(p?.color, productSourceIds, aiFact(g.color)),
    silhouette: aiFact(g.silhouette),
    designFeatures:
      g.design_features.status === "observed" && g.design_features.value.length
        ? fact(g.design_features.value, "observed", "ai_observation", { evidenceImageIds: g.design_features.evidence_image_ids })
        : p?.design_features?.length
          ? fact(p.design_features, "verified", "product_db", { sourceIds: productSourceIds })
          : unknown(),
    sizeOnLabel: unknown(),
    historicPrice: unknown(),
    washing:
      label.washing_instructions.status === "observed" && label.washing_instructions.value.length
        ? fact(label.washing_instructions.value, "observed", "ai_observation", { evidenceImageIds: label.washing_instructions.evidence_image_ids })
        : unknown(),
    description: input.description,
    vintageType: vintage.type,
    vintageTypeNote: p ? vintage.note : "제품이 확인되지 않아 빈티지 유형을 정하지 않았습니다.",
    condition,
    additionalChecks,
    rarity,
    market,
    verification,
    images: [...userImages, ...refImages],
    sources,
    editorial: {
      title: p?.name ?? "Unidentified Find",
      subtitle: p ? [yearSeason, p.collection].filter(Boolean).join(" · ") || null : "제품 미확인 · 내가 촬영한 실물 기록",
      lookbook: lookbook
        ? { imageId: lookbook.id, season: yearSeason, note: `${lookbook.sourceLabel} · 상품 DB 등록 화보` }
        : { imageId: null, season: yearSeason, note: p ? "상품 DB에 공개 가능한 출시 화보가 없습니다." : "제품이 확인되지 않아 출시 화보를 연결하지 않았습니다." },
      story: input.story,
      details,
      then: refImages.map((i) => i.id),
      now: userImages.map((i) => i.id),
    },
    match: session.match ?? undefined,
    createdAt: session.createdAt,
  };
}

/** Gemini 설명 생성이 실패했을 때 — 확인된 사실 · 관찰만 그대로 옮긴다 (예시 문장 아님) */
export function fallbackDescription(product: DbProduct | null, analysis: GarmentAnalysis): DescriptionLine[] {
  const lines: DescriptionLine[] = [];
  if (product?.description) lines.push({ text: product.description, basis: "product_db", sourceIds: product.product_sources.map((s) => s.id) });
  if (analysis.summary_ko) lines.push({ text: analysis.summary_ko, basis: "ai_observation" });
  if (!product) lines.push({ text: "상품 DB에서 일치하는 제품을 확인하지 못해 제품명 · 출시 정보는 표시하지 않습니다.", basis: "none" });
  return lines;
}
