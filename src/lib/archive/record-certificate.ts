import type { CertificateData } from "@/types";
import type { ArchiveRecord } from "@/types/archive-record";

/**
 * ArchiveRecord → 플립 인증서 데이터.
 * 검증 단계가 없으면(null) 인증서를 만들지 않는다. AI 분석만 끝난 경우에도 카드에는 '정품 인증 아님'이 함께 찍힌다.
 */
export function recordToCertificate(record: ArchiveRecord): CertificateData | null {
  const v = record.verification;
  if (v.level === "none") return null;
  const stage = (k: "ai_analyzed" | "archive_matched" | "verified") => v.stages.find((s) => s.key === k);
  const hero = record.images.find((i) => i.src && (i.role === "front" || i.role === "editorial_product")) ?? null;
  const cross = record.match?.crossChecks ?? [];

  return {
    level: v.level,
    productId: record.id,
    certNo: v.recordNo,
    serial: v.recordNo.split("-").at(-1) ?? v.recordNo,
    numberLabel: v.level === "verified" ? "검증 번호" : "기록 번호",
    productName: record.displayName,
    productNameKo: record.displayNameKo ?? record.displayName,
    season: record.releaseSeason.value ?? "시즌 미확인",
    seasonEstimated: record.releaseSeason.status !== "verified",
    collection: record.collection.value ?? "컬렉션 미확인",
    rarityGrade: record.rarity.grade,
    rarityLabel: record.rarity.status === "graded" ? `${record.rarity.score}/100` : "판정 자료 부족",
    vintageType: record.vintageType?.label ?? null,
    verifiedAt: v.date ?? record.createdAt.slice(0, 10),
    dateLabel: v.level === "verified" ? "검증일" : v.level === "archive_matched" ? "확인일" : "분석일",
    items: [
      { label: "제품 정보 확인", detail: stage("archive_matched")?.detail ?? "", passed: Boolean(stage("archive_matched")?.done) },
      {
        label: "출시 시즌 확인",
        detail: record.releaseSeason.value ?? "미확인",
        passed: record.releaseSeason.status === "verified",
      },
      {
        label: "디자인 특징 대조",
        detail: cross.map((c) => `${c.field}: ${c.result}`).join(" · ") || "대조 기록 없음",
        passed: cross.length > 0 && cross.every((c) => c.result === "match"),
      },
      { label: "외관 상태 검수", detail: stage("verified")?.detail ?? "", passed: Boolean(stage("verified")?.done) },
    ],
    photoUrl: hero?.src ?? null,
    detailHref: record.href,
    isDemo: false,
  };
}
