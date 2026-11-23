import { describe, expect, it } from "vitest";
import { SEED_RECORDS, getSeedRecord } from "@/lib/archive/seed-records";
import { SOURCE_CHECKS } from "@/data/seed-verification";
import { recordToCertificate } from "@/lib/archive/record-certificate";

const yellow = getSeedRecord("old-uniqlo-yellow-fleece-coco")!;
const uu = getSeedRecord("uniqlo-u-fleece-cardigan-2017fw")!;

describe("archive_seed.json → 레코드", () => {
  it("두 샘플이 모두 연결된다", () => {
    expect(SEED_RECORDS.map((r) => r.id)).toEqual(["old-uniqlo-yellow-fleece-coco", "uniqlo-u-fleece-cardigan-2017fw"]);
  });

  it("권한 미확인 이미지는 렌더링 URL 을 갖지 않는다", () => {
    for (const r of SEED_RECORDS) {
      for (const im of r.images) {
        expect(im.rights).toBe("unverified");
        expect(im.src).toBeNull();
        expect(im.originalUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it("옐로 플리스 — 출시연도 · 품번 미확인, 판매처 표기는 claimed", () => {
    expect(yellow.releaseYear.value).toBeNull();
    expect(yellow.productCode.value).toBeNull();
    expect(yellow.eraClaim).toMatchObject({ value: "1990s (빈티지 판매처 표기)", status: "claimed", basis: "seller_listing" });
    expect(yellow.vintageType).toBeNull();
    expect(yellow.verification.level).toBe("none");
    expect(recordToCertificate(yellow)).toBeNull();
  });

  it("옐로 플리스 스토리는 브랜드 아카이브로만 표시", () => {
    expect(yellow.editorial.story.length).toBeGreaterThan(0);
    expect(yellow.editorial.story.every((b) => b.scope === "brand")).toBe(true);
    expect(yellow.editorial.lookbook.imageId).toBeNull();
    // 브랜드 매거진 이미지는 THEN(관련 아카이브)이고, 실물 사진은 NOW
    const then = yellow.editorial.then.map((id) => yellow.images.find((i) => i.id === id)!);
    expect(then.every((i) => i.relation === "brand_archive")).toBe(true);
  });

  it("스토리의 연도는 원문 확인 기록에 있는 연도만 쓴다", () => {
    const verified = Object.values(SOURCE_CHECKS).flatMap((c) => c.verifies).join(" ") + " 2017";
    for (const r of SEED_RECORDS) {
      for (const b of r.editorial.story) {
        for (const y of `${b.title} ${b.body}`.match(/(?:19|20)\d{2}/g) ?? []) expect(verified).toContain(y);
        expect(b.sourceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("UNIQLO U — 2017 F/W 는 공식 자료로 확인, 품번 · 희귀도 · 시세는 없음", () => {
    expect(uu.releaseYear).toMatchObject({ value: 2017, status: "verified", basis: "official" });
    expect(uu.releaseSeason.value).toBe("2017 F/W");
    expect(uu.productCode.value).toBeNull();
    expect(uu.rarity.status).toBe("insufficient");
    expect(uu.rarity.grade).toBeNull();
    expect(uu.market).toBeNull();
    expect(uu.color.status).toBe("claimed");
  });

  it("UNIQLO U 인증서는 '아카이브 정보 확인' 단계이며 검증 완료가 아니다", () => {
    const c = recordToCertificate(uu)!;
    expect(c.level).toBe("archive_matched");
    expect(c.rarityGrade).toBeNull();
    expect(c.items.find((i) => i.label === "외관 상태 검수")?.passed).toBe(false);
    expect(c.photoUrl).toBeNull();
  });

  it("누락 부위(back · sleeve · care_label)는 빈 칸으로 남긴다", () => {
    const slots = Object.fromEntries(uu.editorial.details.map((d) => [d.slot, d.imageId]));
    expect(slots.back).toBeNull();
    expect(slots.sleeve).toBeNull();
    expect(slots.label).toBeNull();
    expect(slots.front).not.toBeNull();
  });
});
