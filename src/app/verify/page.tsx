import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { DemoTag } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { VerificationCard } from "@/components/verification/VerificationCard";
import { VERIFICATION_STATUS } from "@/lib/verification";
import { getProducts } from "@/services/archive";
import type { Product, VerificationStatus } from "@/types";

export const metadata: Metadata = { title: "아카이브 인증" };

const STATUSES: VerificationStatus[] = ["verified", "in_review", "needs_review"];

/** 상태별 대표 샘플 */
const SAMPLE_ID: Record<VerificationStatus, string> = {
  verified: "fleece-98-zip",
  in_review: "ut-19-artist",
  needs_review: "denim-01-trucker",
};

function Heading({ index, en, title, note }: { index: string; en: string; title: string; note?: string }) {
  return (
    <div className="mb-6 border-t-2 border-ink pt-4 md:mb-8">
      <p className="eyebrow text-sub">
        <span className="text-brand">{index}</span> — {en}
      </p>
      <h2 className="mt-2 text-[24px] font-extrabold tracking-[-0.03em] md:text-[32px]">{title}</h2>
      {note && <p className="mt-2 max-w-[44em] text-[13px] leading-relaxed text-sub">{note}</p>}
    </div>
  );
}

export default async function VerifyPage() {
  const products = await getProducts();
  const byId = (id: string) => products.find((p) => p.id === id) as Product;
  const samples = STATUSES.map((s) => byId(SAMPLE_ID[s]));
  const cardSamples = [
    ...samples,
    products.find((p) => p.verification?.status === "verified" && p.id !== SAMPLE_ID.verified) as Product,
  ];

  return (
    <div className="container-page pb-10">
      {/* 히어로 */}
      <header className="border-b border-ink pb-10 pt-8 md:pb-14 md:pt-14">
        <div className="flex items-center gap-2">
          <p className="eyebrow text-brand">RE:FOUND Certificate</p>
          <DemoTag>DEMO</DemoTag>
        </div>
        <h1 className="display mt-4 text-[48px] md:text-[96px]">
          Proof of
          <br />
          the Archive<span className="text-brand">.</span>
        </h1>
        <p className="mt-5 max-w-[34em] text-[15px] leading-[1.75] text-sub">
          오래된 유니클로가 어느 시즌의, 어떤 컬렉션의 옷인지 RE:FOUND가 직접 확인하고 인증번호를 남깁니다.
          발견한 옷이 다시 입히고 다시 순환될 수 있도록, 그 첫 근거가 되는 카드입니다.
        </p>
      </header>

      {/* 01. 상태 variation */}
      <section className="mt-12 md:mt-20">
        <Heading
          index="01"
          en="Main Card · States"
          title="인증 카드 상태별 화면"
          note="상태는 카드 상단 밴드의 색과 영문 타이틀로 가장 먼저 구분됩니다. 검증 완료만 유니클로 레드를 면으로 쓰고, 나머지는 블랙과 레드 라인으로 절제합니다."
        />
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3 lg:gap-6">
          {samples.map((p) => (
            <div key={p.id} className="w-[86vw] max-w-[400px] shrink-0 snap-center md:w-auto md:max-w-none">
              <p className="mb-3 flex items-center gap-2 text-[13px] font-bold">
                <VerificationBadge status={p.verification!.status} size="sm" />
                <span className="text-sub">{VERIFICATION_STATUS[p.verification!.status].en}</span>
              </p>
              <VerificationCard product={p} verification={p.verification!} />
            </div>
          ))}
        </div>
      </section>

      {/* 02. 축약형 배지 */}
      <section className="mt-16 md:mt-24">
        <Heading
          index="02"
          en="Compact Badge"
          title="상품 카드용 축약형 배지"
          note="이미지 좌하단에 붙습니다. 좌상단 희귀도 배지(면 색)와 겹쳐 보이지 않도록 ‘상태 마크 + 흰 라벨’ 2단 구조로 만들었습니다."
        />

        <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
          {STATUSES.map((s) => (
            <div key={s} className="bg-white p-5">
              <p className="eyebrow !text-[10px] text-sub">{VERIFICATION_STATUS[s].en}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <VerificationBadge status={s} size="xs" />
                <VerificationBadge status={s} size="sm" />
                <VerificationBadge status={s} size="md" />
              </div>
              <div className="mt-3 flex items-center gap-2.5 bg-paper p-3">
                <VerificationBadge status={s} size="sm" branded />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-sub">{VERIFICATION_STATUS[s].desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-faint">xs · 상품 카드 / sm · 리스트 · 필터 / md · 상세 상단 · branded · 공유 이미지</p>

        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
          {cardSamples.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 03. 상세 페이지 배치 */}
      <section className="mt-16 md:mt-24">
        <Heading
          index="03"
          en="Placement"
          title="상세 페이지 배치 예시"
          note="상단 태그 줄에 branded 배지를 두어 첫 화면에서 인증 상태를 알리고, 배지를 누르면 ‘01 — Verification’ 섹션의 메인 카드로 이동합니다. 데스크톱에서는 카드가 고정되고 오른쪽에 검증 절차와 기준이 이어집니다."
        />

        {/* 와이어 */}
        <div className="grid gap-6 md:grid-cols-[260px_1fr] md:gap-10">
          <div className="mx-auto w-full max-w-[260px] border border-ink bg-white p-3" aria-hidden>
            <div className="aspect-[4/5] bg-paper" />
            <div className="mt-3 flex gap-1">
              <span className="h-3 w-12 bg-ink" />
              <VerificationBadge status="verified" size="xs" branded />
            </div>
            <div className="mt-2 h-5 w-3/4 bg-ink/80" />
            <div className="mt-1.5 h-2.5 w-1/2 bg-line" />
            <div className="mt-3 h-9 bg-brand" />
            <div className="mt-5 border-t-2 border-ink pt-2">
              <p className="text-[9px] font-bold tracking-[0.14em]"><span className="text-brand">01</span> — VERIFICATION</p>
              <div className="mt-2 border border-ink">
                <div className="h-2 bg-brand" />
                <div className="h-14 bg-paper" />
                <div className="space-y-1 p-2">
                  <div className="h-2 w-2/3 bg-ink/70" />
                  <div className="h-2 w-1/2 bg-line" />
                  <div className="h-5 bg-ink" />
                </div>
              </div>
            </div>
            <div className="mt-4 border-t-2 border-ink pt-2">
              <p className="text-[9px] font-bold tracking-[0.14em] text-faint">02 — EVALUATION</p>
            </div>
          </div>

          <ol className="divide-y divide-line border-y border-line">
            {[
              ["상단 태그 줄", "컬렉션 태그 옆 branded 배지. 탭하면 인증 섹션으로 스크롤합니다."],
              ["01 — Verification", "제품 정보 바로 다음, 희귀도 평가보다 앞. 신뢰 근거를 먼저 보여 줍니다."],
              ["카드 버튼", "상세 페이지 안에서는 ‘희귀도 평가 근거 보기’로 바꿔 다음 섹션으로 연결합니다. 목록 · 옷장 · 스캔 결과에서는 기본값 ‘상품 상세보기’."],
              ["오른쪽 패널", "접수 → 검수 → 발급 절차와 다섯 가지 검증 기준. 추가 확인 필요 상태에서는 ‘추가 사진 제출하기’ 버튼이 나타납니다."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[32px_1fr] gap-x-2 py-4">
                <span className="display text-[18px] text-brand">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-[15px] font-bold">{t}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-sub">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 grid gap-2 sm:grid-cols-3">
          {samples.map((p) => (
            <Link
              key={p.id}
              href={`/archive/${p.id}#verification`}
              className="group flex items-center justify-between border border-ink px-4 py-4 transition-colors hover:bg-ink hover:text-white"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold tracking-[0.12em] text-sub group-hover:text-white/60">
                  {VERIFICATION_STATUS[p.verification!.status].en}
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-bold">{p.name}</span>
              </span>
              <ArrowRight size={16} className="shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
