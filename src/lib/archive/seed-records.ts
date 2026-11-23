import { z } from "zod";
import seedJson from "@/data/archive_seed.json";
import { IMAGE_RIGHTS, SEED_CHECKED_AT, SOURCE_CHECKS } from "@/data/seed-verification";
import type {
  ArchiveRecord,
  EditorialDetail,
  ImageRole,
  RecordImage,
  RecordSource,
  StoryBlock,
} from "@/types/archive-record";
import { buildVerification, computeRecordRarity, decideVintageType, fact, unknown } from "./record-rules";

/**
 * archive_seed.json → ArchiveRecord.
 *
 * 원칙
 * 1. seed 값을 그대로 옮기되, 원문에서 확인한 값(SOURCE_CHECKS)만 status "verified" 로 올린다.
 * 2. seed 에 null 로 적힌 값(품번 · 희귀도 · 시세 등)은 끝까지 null 이다.
 * 3. 이미지 권한이 확인되지 않으면 src 를 null 로 두어 렌더링하지 않는다.
 */

const SeedImage = z.object({
  role: z.string(),
  url: z.string().url(),
  source: z.string(),
  same_physical_item: z.boolean().optional(),
  same_collection: z.boolean().optional(),
  note: z.string().optional(),
});

const SeedItem = z.object({
  id: z.string(),
  display_name: z.string(),
  brand: z.string(),
  archive_category: z.string().optional(),
  collection: z.string().optional(),
  era_claim: z.string().optional(),
  release_year_verified: z.number().int().nullable(),
  release_season_verified: z.string().nullable(),
  product_code_verified: z.string().nullable(),
  size_on_label: z.string().optional(),
  color: z.string().optional(),
  historic_uk_price: z.string().optional(),
  rarity_grade: z.string().nullable(),
  current_market_price: z.unknown().nullable(),
  authentication_status: z.string(),
  editorial_title: z.string().optional(),
  editorial_subtitle: z.string().optional(),
  editorial_description: z.string().optional(),
  historical_context: z.string().optional(),
  images: z.array(SeedImage),
  missing_views: z.array(z.string()).optional(),
  sources: z.array(z.object({ type: z.string(), url: z.string().url() })),
});

const Seed = z.object({ dataset_title: z.string(), note: z.string(), items: z.array(SeedItem) });

export type SeedItem = z.infer<typeof SeedItem>;

const ROLE_MAP: Record<string, { role: ImageRole; label: string }> = {
  front: { role: "front", label: "앞면" },
  back: { role: "back", label: "뒷면" },
  angled_front: { role: "angled_front", label: "앞면 측면" },
  sleeve_detail: { role: "sleeve", label: "소매 디테일" },
  shoulder_detail: { role: "shoulder", label: "어깨 디테일" },
  collar_label: { role: "collar_label", label: "칼라 · 라벨" },
  brand_history_magazine: { role: "brand_history", label: "브랜드 아카이브 매거진" },
  product_front_editorial: { role: "editorial_product", label: "제품 단독 사진" },
  original_lookbook: { role: "lookbook", label: "컬렉션 화보" },
};

export function slugOf(seedId: string) {
  return seedId.toLowerCase();
}

function toSources(item: SeedItem): RecordSource[] {
  return item.sources.map((s, i) => {
    const check = SOURCE_CHECKS[s.url];
    return {
      id: `${slugOf(item.id)}-src-${i + 1}`,
      url: s.url,
      checkedAt: check ? SEED_CHECKED_AT : null,
      kind: check?.kind ?? "press",
      label: check?.label ?? s.type,
      publisher: check?.publisher ?? new URL(s.url).hostname,
      date: check?.date ?? null,
      scope: check?.scope ?? "brand",
      verifies: check?.verifies ?? ["원문 미확인 — seed에 기재된 출처"],
    };
  });
}

function sourceIdByHost(sources: RecordSource[], host: string) {
  return sources.find((s) => s.url && new URL(s.url).hostname.includes(host))?.id;
}

function toImages(item: SeedItem, sources: RecordSource[]): RecordImage[] {
  return item.images.map((img, i) => {
    const meta = ROLE_MAP[img.role] ?? { role: "detail" as ImageRole, label: img.role };
    const rights = IMAGE_RIGHTS[img.url];
    const relation = img.same_physical_item
      ? "same_item"
      : img.same_collection
        ? "same_collection"
        : "brand_archive";
    const isPast = relation !== "same_item";
    const allowed = rights?.rights === "licensed";
    const host = new URL(img.url).hostname;
    const sourceId =
      host.includes("baseec")
        ? sourceIdByHost(sources, "base.shop")
        : host.includes("fashionsnap")
          ? sourceIdByHost(sources, "fashionsnap")
          : host.includes("gq.com")
            ? sourceIdByHost(sources, "gq.com")
            : host.includes("uniqlo")
              ? sourceIdByHost(sources, "uniqlo.com")
              : undefined;
    return {
      id: `${slugOf(item.id)}-img-${i + 1}`,
      role: meta.role,
      label: meta.label,
      src: allowed ? img.url : null,
      originalUrl: img.url,
      rights: rights?.rights ?? "unverified",
      rightsNote: rights?.rightsNote ?? "사용 권한이 확인되지 않아 표시하지 않습니다.",
      sourceId,
      sourceLabel: img.source,
      relation,
      era: isPast ? "then" : "now",
      caption: img.note,
      checked: { at: SEED_CHECKED_AT, httpStatus: rights?.httpStatus ?? null },
    };
  });
}

const DETAIL_SLOTS: { slot: EditorialDetail["slot"]; label: string; roles: ImageRole[] }[] = [
  { slot: "front", label: "정면", roles: ["front", "editorial_product"] },
  { slot: "back", label: "후면", roles: ["back"] },
  { slot: "sleeve", label: "소매", roles: ["sleeve"] },
  { slot: "zipper", label: "지퍼 · 여밈", roles: ["zipper"] },
  { slot: "label", label: "라벨", roles: ["collar_label", "care_label"] },
  { slot: "fabric", label: "원단", roles: ["fabric"] },
  { slot: "angle", label: "측면", roles: ["angled_front"] },
  { slot: "shoulder", label: "어깨", roles: ["shoulder"] },
];

function relationCaption(img: RecordImage) {
  const who = img.sourceLabel;
  if (img.relation === "same_item") return `${img.label} — ${who} 촬영 · 판매 당시 동일 실물`;
  if (img.relation === "same_collection") return `${img.label} — ${who} · 같은 컬렉션 자료`;
  return `${img.label} — ${who} · 관련 브랜드 아카이브 (이 제품 아님)`;
}

function buildDetails(images: RecordImage[], missing: string[]): EditorialDetail[] {
  const out: EditorialDetail[] = [];
  for (const d of DETAIL_SLOTS) {
    const img = images.find((i) => d.roles.includes(i.role));
    const isBase = ["front", "back", "sleeve", "zipper", "label", "fabric"].includes(d.slot);
    if (!img && !isBase) continue;
    const missingNote = missing.some((m) => (d.slot === "label" ? m === "care_label" : m.startsWith(d.slot)))
      ? "seed 자료에 이 부위 사진이 없다고 기록되어 있습니다."
      : "이 부위를 촬영한 자료가 없습니다.";
    out.push({
      slot: d.slot,
      label: d.label,
      imageId: img?.id ?? null,
      caption: img ? relationCaption(img) : missingNote,
    });
  }
  return out;
}

function storyFor(item: SeedItem, sources: RecordSource[]): StoryBlock[] {
  const fr = sources.filter((s) => s.publisher.startsWith("FAST RETAILING")).map((s) => s.id);
  const official = sources.filter((s) => s.kind === "official_collection").map((s) => s.id);
  const gq = sources.filter((s) => s.publisher === "GQ").map((s) => s.id);

  if (item.id === "OLD-UNIQLO-YELLOW-FLEECE-COCO" && fr.length) {
    return [
      {
        title: "1994, 첫 플리스",
        body: "유니클로는 1994년 첫 플리스 제품을 선보였습니다.",
        scope: "brand",
        sourceIds: fr.slice(0, 1),
        generatedBy: "editor",
      },
      {
        title: "1998, 1,900엔의 계절",
        body: "1998년 10월, 1,900엔 플리스 캠페인이 큰 관심을 모았습니다. 한 달 뒤 첫 도심형 매장인 하라주쿠점이 문을 열었고, 플리스는 일상의 캐주얼웨어로 제안되었습니다.",
        scope: "brand",
        sourceIds: fr,
        generatedBy: "editor",
      },
    ];
  }
  if (item.id === "UNIQLO-U-FLEECE-CARDIGAN-2017FW" && official.length) {
    return [
      {
        title: "2017 F/W, Uniqlo U",
        body: "Uniqlo U 2017 가을겨울 공식 컬렉션 페이지에 'Fleece cardigan'이 £39.90로 실렸습니다.",
        scope: "product",
        sourceIds: official,
        generatedBy: "editor",
      },
      ...(gq.length
        ? [
            {
              title: "Lemaire의 라인",
              body: "2017년 10월 GQ는 Uniqlo U를 크리스토프 르메르의 라인으로 소개하며, 이 시즌의 플리스 카디건을 $40로 함께 다뤘습니다.",
              scope: "collection" as const,
              sourceIds: gq,
              generatedBy: "editor" as const,
            },
          ]
        : []),
    ];
  }
  return [];
}

function toRecord(item: SeedItem): ArchiveRecord {
  const slug = slugOf(item.id);
  const sources = toSources(item);
  const images = toImages(item, sources);
  const official = sources.filter((s) => s.kind === "official_collection" && s.checkedAt);
  const officialIds = official.map((s) => s.id);
  const press = sources.filter((s) => s.kind === "press" && s.checkedAt).map((s) => s.id);
  const listing = sources.filter((s) => s.kind === "used_item_listing").map((s) => s.id);

  // 출시 정보는 공식 자료가 확인된 경우에만 verified
  const yearVerified = item.release_year_verified !== null && official.length > 0;
  const releaseYear = yearVerified ? item.release_year_verified : null;
  const isUniqloU = item.collection === "Uniqlo U";
  const vintage = decideVintageType({
    releaseYear,
    collabPartner: undefined,
    limitedEdition: null,
  });

  const lookbookImg = images.find((i) => i.role === "lookbook");
  const description = isUniqloU
    ? [
        { text: "2017 F/W Uniqlo U 컬렉션에 실린 플리스 카디건입니다.", basis: "official" as const, sourceIds: officialIds },
        { text: "당시 영국 공식 페이지 판매가는 £39.90, GQ 기사 표기는 $40였습니다.", basis: "official" as const, sourceIds: [...officialIds, ...press] },
        { text: "품번과 개별 실물은 아직 확인되지 않았습니다.", basis: "none" as const },
      ]
    : [
        { text: "‘1990년대 OLD UNIQLO’로 표기되어 판매된 옐로 집업 플리스입니다.", basis: "seller_listing" as const, sourceIds: listing },
        { text: "출시연도 · 시즌 · 품번은 공식 자료로 확인되지 않았습니다.", basis: "none" as const },
      ];

  return {
    id: slug,
    kind: "seed",
    href: `/archive/${slug}`,
    displayName: item.display_name,
    displayNameKo: isUniqloU ? "유니클로 유 플리스 카디건" : "올드 유니클로 옐로 집업 플리스",
    brand: item.brand,
    collection: isUniqloU
      ? fact(item.collection ?? null, "verified", "official", { sourceIds: officialIds })
      : fact(item.archive_category ?? null, "claimed", "seller_listing", { sourceIds: listing, note: "RE:FOUND 분류명 · 판매처 표기 기준" }),
    releaseYear: yearVerified
      ? fact(item.release_year_verified, "verified", "official", { sourceIds: [...officialIds, ...press] })
      : unknown("공식 자료로 확인되지 않음"),
    releaseSeason:
      item.release_season_verified && official.length
        ? fact(item.release_season_verified, "verified", "official", { sourceIds: officialIds })
        : unknown("공식 자료로 확인되지 않음"),
    eraClaim: item.era_claim
      ? fact(item.era_claim, "claimed", "seller_listing", { sourceIds: listing })
      : unknown(),
    productCode: item.product_code_verified
      ? fact(item.product_code_verified, "verified", "official")
      : unknown("케어라벨 품번 미확인"),
    category: isUniqloU
      ? fact("플리스 카디건", "verified", "official", { sourceIds: officialIds, note: "공식 상품명 'Fleece cardigan'" })
      : fact("집업 플리스 재킷", "claimed", "seller_listing", { sourceIds: listing }),
    material: unknown("케어라벨 자료 없음"),
    fit: unknown(),
    color: item.color
      ? fact(item.color, "claimed", isUniqloU ? "press" : "seller_listing", {
          sourceIds: isUniqloU ? press : listing,
          note: isUniqloU ? "seed 기재 색상 · 공식 페이지에서는 색상명을 확인하지 못함" : "판매처 사진 기준 seed 기재",
        })
      : unknown(),
    silhouette: unknown(),
    designFeatures: unknown(),
    sizeOnLabel: item.size_on_label
      ? fact(item.size_on_label, "claimed", "seller_listing", { sourceIds: listing })
      : unknown(),
    historicPrice: item.historic_uk_price && official.length
      ? fact("£39.90 (2017 UK)", "verified", "official", { sourceIds: officialIds })
      : unknown(),
    washing: unknown(),
    description,
    vintageType: vintage.type,
    vintageTypeNote: vintage.note,
    condition: null,
    additionalChecks: [],
    rarity: computeRecordRarity({
      releaseYear,
      discontinued: null,
      collabPartner: undefined,
      productionScale: null,
      activeListings: null,
      soldLast90Days: null,
    }),
    market: null,
    verification: buildVerification({
      recordNo: isUniqloU ? "RF-AR-17FW-UUFC" : "RF-AR-90S-YLFL",
      date: official.length ? SEED_CHECKED_AT : null,
      aiAnalyzed: { done: false, detail: "RE:FOUND 촬영 · AI 분석 기록이 없습니다." },
      archiveMatched: official.length
        ? {
            done: true,
            detail: "UNIQLO 공식 2017 F/W 컬렉션 페이지에서 'Fleece cardigan' 게재를 확인했습니다. 품번과 개별 실물은 확인되지 않았습니다.",
          }
        : { done: false, detail: "공식 자료로 출시연도 · 품번을 확인하지 못했습니다." },
      verified: { done: false, detail: "RE:FOUND 실물 검수를 거치지 않았습니다." },
    }),
    images,
    sources,
    editorial: {
      title: item.editorial_title ?? null,
      subtitle: item.editorial_subtitle ?? null,
      lookbook: lookbookImg
        ? {
            imageId: lookbookImg.id,
            season: item.release_season_verified,
            note: `${lookbookImg.sourceLabel} · 같은 컬렉션 공식 화보`,
          }
        : { imageId: null, season: null, note: "이 제품의 출시 당시 컬렉션 화보는 확인되지 않았습니다." },
      story: storyFor(item, sources),
      details: buildDetails(images, item.missing_views ?? []),
      then: images.filter((i) => i.era === "then").map((i) => i.id),
      now: images.filter((i) => i.era === "now").map((i) => i.id),
    },
    createdAt: SEED_CHECKED_AT,
  };
}

const parsed = Seed.parse(seedJson);

export const SEED_NOTE = parsed.note;

export const SEED_RECORDS: ArchiveRecord[] = parsed.items.map(toRecord);

export function getSeedRecord(slug: string) {
  return SEED_RECORDS.find((r) => r.id === slug) ?? null;
}
