import { describe, expect, it } from "vitest";
import { buildVerification, computeRecordRarity, decideVintageType, soldInLastDays, summarizeMarket } from "@/lib/archive/record-rules";

const now = new Date("2026-11-20T00:00:00Z");
const empty = { releaseYear: null, discontinued: null, collabPartner: undefined, productionScale: null, activeListings: null, soldLast90Days: null, now };

describe("희귀도 — 실제 자료가 있는 항목만 반영", () => {
  it("자료가 없으면 등급을 만들지 않는다", () => {
    const r = computeRecordRarity(empty);
    expect(r.status).toBe("insufficient");
    expect(r.grade).toBeNull();
    expect(r.score).toBeNull();
    expect(r.factors.every((f) => !f.available && f.points === null)).toBe(true);
  });

  it("출시연도만 확인된 경우에도 판정 자료 부족", () => {
    const r = computeRecordRarity({ ...empty, releaseYear: 2017 });
    expect(r.status).toBe("insufficient");
    expect(r.factors.find((f) => f.key === "age")?.available).toBe(true);
  });

  it("공급 지표(생산량 또는 매물) 없이 4개 항목이어도 산정하지 않는다", () => {
    const r = computeRecordRarity({ ...empty, releaseYear: 1998, discontinued: true, collabPartner: null, soldLast90Days: 3 });
    expect(r.status).toBe("insufficient");
  });

  it("충분한 자료가 있으면 확인된 항목 최대점 기준으로 산정", () => {
    const r = computeRecordRarity({ ...empty, releaseYear: 1998, discontinued: true, collabPartner: null, activeListings: 2 });
    expect(r.status).toBe("graded");
    expect(r.maxScore).toBe(30 + 15 + 10 + 20);
    expect(r.score).toBe(Math.round(((30 + 15 + 0 + 20) / 75) * 100));
    expect(r.grade).toBe("S");
  });
});

describe("빈티지 유형", () => {
  it("출시연도 미확인이면 유형을 정하지 않는다", () => {
    expect(decideVintageType({ releaseYear: null, collabPartner: undefined, limitedEdition: null, now }).type).toBeNull();
  });
  it("협업 > 한정 > 시대 > 일반 순서", () => {
    expect(decideVintageType({ releaseYear: 2009, collabPartner: "Jil Sander", limitedEdition: true, now }).type?.label).toBe("협업 컬렉션형");
    expect(decideVintageType({ releaseYear: 2009, collabPartner: null, limitedEdition: true, now }).type?.label).toBe("한정 컬렉션형");
    expect(decideVintageType({ releaseYear: 1998, collabPartner: undefined, limitedEdition: null, now }).type?.label).toBe("시대 아카이브형");
    expect(decideVintageType({ releaseYear: 2017, collabPartner: undefined, limitedEdition: null, now }).type?.label).toBe("일반 아카이브형");
  });
});

describe("검증 단계 — AI 분석 ≠ 정품 인증", () => {
  const base = { recordNo: "X", date: null, verified: { done: false, detail: "" } };
  it("AI 분석만 끝나면 ai_analyzed", () => {
    expect(buildVerification({ ...base, aiAnalyzed: { done: true, detail: "" }, archiveMatched: { done: false, detail: "" } }).level).toBe("ai_analyzed");
  });
  it("DB 일치는 archive_matched 이고 verified 가 아니다", () => {
    const v = buildVerification({ ...base, aiAnalyzed: { done: true, detail: "" }, archiveMatched: { done: true, detail: "" } });
    expect(v.level).toBe("archive_matched");
    expect(v.stages.find((s) => s.key === "verified")?.done).toBe(false);
  });
});

describe("시세 — 호가와 실거래 분리", () => {
  it("데이터가 없으면 null", () => expect(summarizeMarket([])).toBeNull());
  it("asking / sold 를 따로 집계", () => {
    const m = summarizeMarket([
      { price: 30000, currency: "KRW", price_type: "asking", source_name: "A", collected_at: "2026-11-01" },
      { price: 50000, currency: "KRW", price_type: "asking", source_name: "A", collected_at: "2026-11-02" },
      { price: 41000, currency: "KRW", price_type: "sold", source_name: "B", collected_at: "2026-11-03", sold_at: "2026-10-30" },
    ]);
    expect(m?.asking).toEqual({ count: 2, low: 30000, high: 50000, median: 40000 });
    expect(m?.sold?.count).toBe(1);
    expect(m?.sources).toEqual(["A", "B"]);
    expect(m?.collectedFrom).toBe("2026-11-01");
  });
  it("실거래 데이터가 없으면 수요는 null (0건과 구분)", () => {
    expect(soldInLastDays([{ price: 1, currency: "KRW", price_type: "asking", source_name: "A", collected_at: "2026-11-01" }], 90, now)).toBeNull();
  });
});
