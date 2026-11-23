import { RARITY_LABEL } from "@/lib/rarity";
import type {
  CertificateData,
  CheckResult,
  Product,
  Verification,
  VerificationCheckKey,
  VerificationStatus,
} from "@/types";

/** 상태별 표기 — 카드 · 배지 · 상세 페이지가 모두 이 값을 공유한다 */
export const VERIFICATION_STATUS: Record<
  VerificationStatus,
  { label: string; short: string; en: string; desc: string }
> = {
  verified: {
    label: "검증 완료",
    short: "검증 완료",
    en: "VERIFIED",
    desc: "RE:FOUND 검증 기준 5개 항목을 모두 통과했습니다.",
  },
  in_review: {
    label: "검증 진행 중",
    short: "검증 중",
    en: "IN REVIEW",
    desc: "검수 담당자가 항목별로 확인하고 있습니다.",
  },
  needs_review: {
    label: "추가 확인 필요",
    short: "확인 필요",
    en: "ACTION REQUIRED",
    desc: "일부 항목을 판단하기 위해 추가 자료가 필요합니다.",
  },
};

export const CHECK_RESULT_LABEL: Record<CheckResult, string> = {
  pass: "통과",
  pending: "대기",
  flag: "확인 필요",
};

/** 검증 기준 항목 설명 (상세 페이지 안내용) */
export const CHECK_GUIDE: Record<string, string> = {
  label: "메인택 서체, 로고 형태, 케어라벨의 생산국 · 세탁 기호 표기를 시기별 기준 샘플과 대조합니다.",
  season: "택에 적힌 품번 체계와 시즌 코드를 아카이브 DB의 출시 기록과 맞춰 봅니다.",
  material: "표기된 혼용률과 실제 원단 조직, 봉제 스티치 간격을 확인합니다.",
  hardware: "지퍼, 단추, 리벳 등 부자재가 당시 사양과 같은지, 교체 흔적이 있는지 봅니다.",
  condition: "보풀 · 변색 · 손상 정도를 기록합니다. 상태는 인증 여부와 희귀도 등급에 반영하지 않습니다.",
};

export function checkProgress(v: Verification) {
  const total = v.checks.length;
  const passed = v.checks.filter((c) => c.result === "pass").length;
  const flagged = v.checks.filter((c) => c.result === "flag").length;
  const done = total - v.checks.filter((c) => c.result === "pending").length;
  return { total, passed, flagged, done };
}

/** 인증번호로부터 결정적인 바코드 막대 폭(1–3)을 만든다. 장식용이며 실제로 스캔되지 않는다. */
export function barcodeBars(code: string) {
  const bars: number[] = [];
  for (const ch of code) {
    const n = ch.charCodeAt(0);
    bars.push((n % 3) + 1, ((n >> 2) % 2) + 1);
  }
  // 모바일 폭(약 335px 카드)에서도 인증번호가 잘리지 않도록 막대 수를 제한한다
  return bars.slice(0, 30);
}

/* ───────── 플립 인증서 ───────── */

/** 인증서 뒷면의 4개 검증 항목 ← 내부 5개 검수 기준을 묶어서 만든다 */
const CERTIFICATE_ITEMS: { label: string; from: VerificationCheckKey[] }[] = [
  { label: "제품 정보 확인", from: ["label"] },
  { label: "출시 시즌 확인", from: ["season"] },
  { label: "디자인 특징 대조", from: ["material", "hardware"] },
  { label: "외관 상태 검수", from: ["condition"] },
];

/** 인증서에서는 일반 아카이브 라인을 "OLD UNIQLO"로 표기한다 */
function certificateCollection(collection: string) {
  return collection === "UNIQLO Archive" ? "OLD UNIQLO" : collection;
}

/** 제품 데이터 → 인증서 데이터. 검증 완료 + 인증번호 발급 건만 인증서를 만든다. */
export function toCertificate(product: Product): CertificateData | null {
  const v = product.verification;
  if (!v || v.status !== "verified" || !v.certNo || !v.verifiedAt) return null;

  return {
    level: "verified",
    numberLabel: "검증 번호",
    dateLabel: "검증일",
    productId: product.id,
    certNo: v.certNo,
    serial: v.certNo.split("-").at(-1) ?? v.certNo,
    productName: product.name,
    productNameKo: product.nameKo,
    season: `${product.season.year} ${product.season.term}`,
    seasonEstimated: product.season.estimated,
    collection: certificateCollection(product.collection),
    rarityGrade: product.rarity.grade,
    rarityLabel: RARITY_LABEL[product.rarity.grade],
    verifiedAt: v.verifiedAt,
    items: CERTIFICATE_ITEMS.map((item) => {
      const checks = v.checks.filter((c) => item.from.includes(c.key));
      return {
        label: item.label,
        detail: checks.map((c) => c.detail).join(" · "),
        passed: checks.length > 0 && checks.every((c) => c.result === "pass"),
      };
    }),
    garment: product.garment,
    detailHref: `/archive/${product.id}`,
    isDemo: product.provenance.status === "demo",
  };
}
