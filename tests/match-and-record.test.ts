import { describe, expect, it } from "vitest";
import { buildScanRecord, fallbackDescription } from "@/lib/scan/build-record";
import { applyShot, createFlow, skipStep } from "@/lib/scan/flow";
import { buildCandidates, compareField, summarizeMatch } from "@/lib/scan/match";
import type { ScanSession } from "@/lib/scan/session";
import type { DbProduct } from "@/services/product-db";
import { analysisFixture, reviewFixture } from "./fixtures";

const product = (over: Partial<DbProduct> = {}): DbProduct => ({
  id: "p1",
  brand: "UNIQLO",
  product_code: "123456",
  product_code_normalized: "123456",
  name: "Fleece Full-Zip Jacket",
  name_ko: "플리스 풀집 재킷",
  collection: "UNIQLO",
  release_year: 1998,
  release_season: "F/W",
  category: "플리스 재킷",
  color: "Yellow",
  material: "Polyester 100%",
  fit: null,
  design_features: ["stand collar", "full zip"],
  description: "공식 설명",
  collab_partner: null,
  is_collaboration: false,
  limited_edition: null,
  discontinued: true,
  production_scale: null,
  production_note: null,
  primary_source_url: "https://example.com/official",
  product_sources: [{ id: "s1", kind: "official_collection", publisher: "UNIQLO", title: null, url: "https://example.com/official", published_on: null, scope: "product", excerpt: null, verifies: [], checked_at: "2026-11-20" }],
  product_images: [],
  ...over,
});

function session(match: ScanSession["match"]): ScanSession {
  let flow = createFlow();
  flow = applyShot(flow, "base-1", "img-front", { kind: "accept" }, reviewFixture());
  flow = skipStep(flow, "base-2");
  flow = applyShot(flow, "base-3", "img-label", { kind: "accept" }, reviewFixture());
  return {
    id: "abcd-1234",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    consent: { analysis: true, storage: false, at: "2026-11-20T10:00:00.000Z" },
    model: "gemini-test",
    flow,
    images: [],
    analysis: analysisFixture(),
    match,
    product: null,
    record: null,
    remote: null,
  };
}

describe("제품 교차 검증", () => {
  it("색상 · 유형 동의어", () => {
    expect(compareField("색상", "Yellow", "옐로").result).toBe("match");
    expect(compareField("색상", "Navy", "옐로").result).toBe("mismatch");
    expect(compareField("색상", null, "옐로").result).toBe("unknown");
  });
  it("품번 정확 일치 후보가 가장 앞", () => {
    const list = buildCandidates(analysisFixture(), [product()], [product({ id: "p2", product_code_normalized: "999", name: "Other" })]);
    expect(list[0].product.id).toBe("p1");
    expect(list[0].method).toBe("product_code");
  });
  it("DB 미연결 · 후보 없음은 제품 미확인", () => {
    expect(summarizeMatch("db_unavailable", null, "123456", 0).status).toBe("db_unavailable");
    expect(summarizeMatch("unconfirmed", null, "123456", 0).note).toContain("상품 DB에 해당 제품이 없습니다");
  });
});

describe("스캔 → 상세 페이지 데이터", () => {
  it("제품 미확인이면 출시 정보 · 희귀도 · 시세를 만들지 않는다", () => {
    const s = session(summarizeMatch("unconfirmed", null, "123456", 0));
    const r = buildScanRecord({ session: s, analysis: s.analysis!, product: null, productImageUrls: {}, listings: [], description: fallbackDescription(null, s.analysis!), story: [] });
    expect(r.displayName).toBe("제품 미확인");
    expect(r.releaseYear.value).toBeNull();
    expect(r.vintageType).toBeNull();
    expect(r.rarity.status).toBe("insufficient");
    expect(r.market).toBeNull();
    expect(r.verification.level).toBe("ai_analyzed");
    expect(r.productCode).toMatchObject({ value: "123456", status: "observed", basis: "ai_observation" });
    // 앞면 사진이 대표 이미지, 건너뛴 뒷면은 추가 확인 필요
    expect(r.images[0]).toMatchObject({ id: "img-front", role: "front", rights: "own_capture" });
    expect(r.additionalChecks.some((c) => c.target === "의류 뒷면")).toBe(true);
    // 손상은 의심까지만, 근거 사진 연결
    expect(r.condition?.find((c) => c.key === "pilling")).toMatchObject({ status: "suspected", evidenceImageIds: ["img-sleeve"] });
  });

  it("확인된 제품은 DB 사실을 쓰고 '아카이브 정보 확인' 단계가 된다 (검증 완료 아님)", () => {
    const p = product();
    const list = buildCandidates(analysisFixture(), [p], []);
    const s = session(summarizeMatch("confirmed", list[0], "123456", 1));
    const r = buildScanRecord({ session: s, analysis: s.analysis!, product: p, productImageUrls: {}, listings: [], description: [], story: [], now: new Date("2026-11-20") });
    expect(r.displayName).toBe("Fleece Full-Zip Jacket");
    expect(r.releaseYear).toMatchObject({ value: 1998, status: "verified", basis: "product_db" });
    expect(r.color).toMatchObject({ value: "Yellow", basis: "product_db" });
    expect(r.vintageType?.label).toBe("시대 아카이브형");
    expect(r.verification.level).toBe("archive_matched");
    expect(r.verification.stages.find((x) => x.key === "verified")?.done).toBe(false);
    // 시세 데이터가 없으므로 공급 지표가 없어 희귀도 산정 불가
    expect(r.rarity.status).toBe("insufficient");
  });
});
