import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  ChevronRight,
  Info,
  Layers,
  Lightbulb,
  Package,
  Palette,
  Ruler,
  Tag,
  WashingMachine,
} from "lucide-react";
import { PrimaryActions, ServiceSection } from "@/components/archive/DetailActions";
import { Gallery } from "@/components/archive/Gallery";
import { EditorialUnavailable } from "@/components/archive/editorial/ArchiveEditorial";
import { RecordDetail } from "@/components/archive/record/RecordDetail";
import { SectionTitle } from "@/components/archive/SectionTitle";
import { PriceChart } from "@/components/charts/PriceChart";
import { EVAL_LABEL, EVAL_ORDER, RadarChart } from "@/components/charts/RadarChart";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { CertificateLauncher } from "@/components/certificate/CertificateLauncher";
import { ProductCard } from "@/components/product/ProductCard";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { VerificationCard } from "@/components/verification/VerificationCard";
import { VerificationProcess } from "@/components/verification/VerificationProcess";
import { DemoTag, SectionHeader } from "@/components/ui/primitives";
import { CATEGORY_LABEL, priceRange, seasonLabel, shortYear, won } from "@/lib/format";
import { RARITY_LABEL } from "@/lib/rarity";
import { toCertificate } from "@/lib/verification";
import {
  getCareGuide,
  getProduct,
  getProducts,
  getRelatedProducts,
} from "@/services/archive";
import { SEED_RECORDS, getSeedRecord } from "@/lib/archive/seed-records";

export async function generateStaticParams() {
  const products = await getProducts();
  return [...products.map((p) => ({ id: p.id })), ...SEED_RECORDS.map((r) => ({ id: r.id }))];
}

export async function generateMetadata({ params }: PageProps<"/archive/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  const record = getSeedRecord(id);
  return { title: product?.name ?? record?.displayName ?? "아카이브" };
}

export default async function ArchiveDetailPage({ params }: PageProps<"/archive/[id]">) {
  const { id } = await params;
  // 출처 확인 자료(seed)는 Mock 제품과 다른 데이터 구조 · 다른 화면으로 그린다
  const record = getSeedRecord(id);
  if (record) {
    return <RecordDetail record={record} related={SEED_RECORDS.filter((r) => r.id !== record.id)} />;
  }

  const product = await getProduct(id);
  if (!product) notFound();

  const [care, related] = await Promise.all([getCareGuide(product), getRelatedProducts(product)]);
  const { rarity, market, story } = product;
  const certificate = toCertificate(product);
  const avg = (EVAL_ORDER.reduce((s, k) => s + product.evaluation[k].score, 0) / EVAL_ORDER.length).toFixed(1);

  const specs = [
    { icon: Calendar, label: "제작 연도", value: seasonLabel(product.season) },
    { icon: Layers, label: "소재", value: product.material },
    { icon: Ruler, label: "핏", value: product.fit },
    { icon: Palette, label: "색상", value: `${product.color.name}${product.color.others ? ` ${product.color.others}` : ""}` },
    { icon: Tag, label: "희귀도 등급", value: `${rarity.grade} (${RARITY_LABEL[rarity.grade]})`, accent: true },
  ];

  const careBlocks = [
    { icon: Layers, title: "소재 정보", items: care.material },
    { icon: WashingMachine, title: "세탁 방법", items: care.washing },
    { icon: Package, title: "보관 가이드", items: care.storage },
    { icon: Lightbulb, title: "상태 유지 팁", items: care.tips },
  ];

  return (
    <article data-action-bar>
      <div className="container-page">
        {/* 경로 */}
        <nav aria-label="경로" className="flex h-11 items-center gap-1 text-[12px] text-sub">
          <Link href="/explore" className="hover:text-ink">아카이브</Link>
          <ChevronRight size={12} />
          <Link href={`/explore?category=${product.category}`} className="hover:text-ink">
            {CATEGORY_LABEL[product.category]}
          </Link>
          <ChevronRight size={12} />
          <span className="truncate text-ink">{product.name}</span>
        </nav>

        {/* 상단 */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <div className="-mx-5 md:mx-0">
            <div className="md:sticky md:top-24">
              <Gallery product={product} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center bg-ink px-2 text-[11px] font-bold tracking-wide text-white">
                {product.collection}
              </span>
              {product.collab && (
                <span className="inline-flex h-6 items-center border border-brand px-2 text-[11px] font-bold text-brand">
                  {product.collab.note}
                </span>
              )}
              {product.verification && (
                <a href="#verification" aria-label="인증 정보로 이동">
                  <VerificationBadge status={product.verification.status} branded className="!h-6" />
                </a>
              )}
              <DemoTag className="!h-6">DEMO DATA · 공식 인증 아님</DemoTag>
            </div>

            <p className="display mt-5 text-[64px] text-brand md:text-[88px]">{shortYear(product.season)}</p>
            <h1 className="mt-1 text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[40px]">
              {product.name}
            </h1>
            <p className="mt-1.5 text-[16px] font-medium text-sub">
              {product.nameKo} · {seasonLabel(product.season)}
            </p>
            <p className="mt-4 text-[15px] leading-[1.75]">{product.description}</p>

            {/* 희귀도 유형 */}
            <div className="mt-6 border-l-[3px] border-brand bg-brand-tint p-4 md:p-5">
              <p className="eyebrow !text-[10px] text-brand">희귀도 유형 · Archive Type</p>
              <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em] text-brand">
                {product.archiveType.label}
                <span className="ml-2 text-[13px] font-semibold text-brand/70">{product.archiveType.en}</span>
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{product.archiveType.desc}</p>
            </div>

            {/* 가격 요약 */}
            <a href="#market" className="mt-5 flex items-end justify-between border-y border-line py-4">
              <div>
                <p className="text-[12px] text-sub">중고 매물 호가 범위</p>
                <p className="mt-0.5 text-[24px] font-extrabold tracking-[-0.03em]">
                  {market ? priceRange(market) : <span className="text-faint">가격 정보 없음</span>}
                </p>
              </div>
              <span className="flex items-center gap-0.5 text-[12px] text-sub">
                {market ? `매물 ${market.listings}건` : "매물 없음"} <ChevronRight size={14} />
              </span>
            </a>

            <div className="mt-5">
              <PrimaryActions product={product} />
            </div>

            {/* A. 기본 정보 */}
            <dl className="mt-6 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3">
              {specs.map((s) => (
                <div key={s.label} className="border-b border-r border-line p-4">
                  <s.icon size={20} strokeWidth={1.6} className={s.accent ? "text-brand" : "text-ink"} />
                  <dt className="mt-3 text-[12px] text-sub">{s.label}</dt>
                  <dd className={`mt-0.5 text-[14px] font-bold leading-snug ${s.accent ? "text-brand" : ""}`}>{s.value}</dd>
                </div>
              ))}
              <div className="border-b border-r border-line p-4">
                <Info size={20} strokeWidth={1.6} />
                <dt className="mt-3 text-[12px] text-sub">출처 · 검증 상태</dt>
                <dd className="mt-0.5 text-[14px] font-bold leading-snug">{product.provenance.source}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] leading-relaxed text-faint">{product.provenance.note}</p>
          </div>
        </div>

        {/* A-2. 아카이브 인증 */}
        <section id="verification" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle
            index="01"
            en="Verification"
            title="아카이브 인증"
            note="RE:FOUND 검수 담당자가 택 · 품번 · 소재 · 부자재 · 상태를 확인하고 인증번호를 발급합니다. 인증 여부는 희귀도 등급과 별개입니다."
          />
          {product.verification ? (
            <div className="grid gap-10 md:grid-cols-[minmax(0,400px)_1fr] md:gap-x-14">
              {/* 인증서 진입점 — 모바일에서는 맨 위, 데스크톱에서는 오른쪽 상단 */}
              {certificate && (
                <div className="md:col-start-2 md:row-start-1 md:self-start">
                  <CertificateLauncher certificate={certificate} />
                </div>
              )}
              <div className="mx-auto w-full max-w-[420px] md:sticky md:top-24 md:col-start-1 md:row-span-2 md:row-start-1 md:mx-0 md:self-start">
                <VerificationCard
                  product={product}
                  verification={product.verification}
                  action={{ href: "#evaluation", label: "희귀도 평가 근거 보기" }}
                />
              </div>
              <div className="md:col-start-2">
                <VerificationProcess verification={product.verification} />
              </div>
            </div>
          ) : (
            <div className="border border-line bg-paper px-5 py-12 text-center">
              <p className="display text-[30px] text-faint">NOT VERIFIED</p>
              <p className="mt-3 text-[15px] font-bold">아직 인증 이력이 없습니다</p>
              <Link href="/scan" className="mt-4 inline-flex h-11 items-center gap-1 text-[13px] font-bold text-brand">
                스캔하고 검증 요청하기 <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </section>

        {/* B. 평가 */}
        <section id="evaluation" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle
            index="02"
            en="Evaluation"
            title="희귀도 평가"
            note="종합 평가(레이더 차트)와 희귀도 등급은 따로 산정합니다. 희귀도 등급에는 의류 상태와 수요가 반영되지 않습니다."
          />

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            {/* 종합 평가 */}
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-[17px] font-extrabold">제품 종합 평가</h3>
                <p className="text-[13px] text-sub">
                  평균 <b className="text-[20px] font-extrabold text-ink">{avg}</b> / 5
                </p>
              </div>
              <div className="mx-auto mt-2 max-w-[360px]">
                <RadarChart evaluation={product.evaluation} />
              </div>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {EVAL_ORDER.map((k) => (
                  <li key={k} className="flex items-center gap-3 py-3">
                    <span className="w-[76px] shrink-0 text-[13px] font-bold">{EVAL_LABEL[k]}</span>
                    <span className="w-5 shrink-0 text-[17px] font-extrabold text-brand">{product.evaluation[k].score}</span>
                    <span className="text-[13px] leading-snug text-sub">{product.evaluation[k].reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              {/* 희귀도 등급 */}
              <div className="border border-ink">
                <div className="flex items-stretch">
                  <div className="flex w-[104px] shrink-0 flex-col items-center justify-center bg-brand py-5 text-white md:w-[128px]">
                    <span className="text-[11px] font-semibold tracking-[0.14em]">RARITY</span>
                    <span className="display text-[72px] md:text-[88px]">{rarity.grade}</span>
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-4 md:p-5">
                    <h3 className="text-[17px] font-extrabold">희귀도 등급 · {RARITY_LABEL[rarity.grade]}</h3>
                    <p className="mt-1 text-[13px] text-sub">
                      희소성 지표 합계 <b className="text-[18px] font-extrabold text-ink">{rarity.score}</b> / 100
                    </p>
                    <p className="mt-2 text-[12px] leading-relaxed text-faint">
                      S 85+ · A 65+ · B 45+ · C 45 미만
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-line border-t border-ink">
                  {rarity.factors.map((f) => (
                    <li key={f.key} className="px-4 py-3.5 md:px-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-bold">{f.label}</span>
                        <span className="text-[13px] text-sub">{f.value}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 bg-paper">
                          <div className="h-full bg-ink" style={{ width: `${(f.points / f.max) * 100}%` }} />
                        </div>
                        <span className="w-[52px] shrink-0 text-right text-[12px] font-bold">
                          {f.points}<span className="font-normal text-faint"> / {f.max}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-line bg-paper px-4 py-3 text-[12px] leading-relaxed text-sub md:px-5">
                  생산 규모 근거: {product.scarcity.productionNote}. 가중치와 수치는 데모용입니다.
                </p>
              </div>

              {/* 의류 상태 */}
              <div className="border border-line p-4 md:p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[17px] font-extrabold">의류 상태</h3>
                  <span className="text-[15px] font-extrabold">{product.condition.label}</span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {product.condition.notes.map((n) => (
                    <li key={n} className="bg-paper px-2.5 py-1.5 text-[12px] font-medium">{n}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[12px] leading-relaxed text-sub">
                  아카이브 기준 샘플의 상태입니다. 상태는 옷마다 다르므로 희귀도 등급에 넣지 않고, 스캔할 때 개별적으로 평가합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* C. 시장 가치 */}
        <section id="market" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle index="03" en="Market Value" title="시장 가치" />
          {market ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
              <div>
                <p className="text-[13px] text-sub">중고 매물 호가 기준 예상 가격 범위</p>
                <p className="display mt-2 text-[34px] md:text-[44px]">
                  ₩{won(market.low)}
                  <span className="mx-2 text-faint">–</span>
                  {won(market.high)}
                </p>
                <dl className="mt-6 grid grid-cols-2 border-l border-t border-line">
                  <div className="border-b border-r border-line p-4">
                    <dt className="text-[12px] text-sub">비교 가능한 매물</dt>
                    <dd className="mt-1 text-[20px] font-extrabold">{market.listings}건</dd>
                  </div>
                  <div className="border-b border-r border-line p-4">
                    <dt className="text-[12px] text-sub">데이터 기준일</dt>
                    <dd className="mt-1 text-[20px] font-extrabold">{market.asOf}</dd>
                  </div>
                </dl>
                <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-sub">
                  <Info size={14} className="mt-0.5 shrink-0 text-brand" />
                  판매자가 올린 호가를 모은 값이며 실제 거래가 성사된 가격이 아닙니다. 상태와 사이즈에 따라 달라질 수 있습니다. (데모 데이터)
                </p>
              </div>
              <div className="border border-line p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-extrabold">최근 6개월 호가 추이</h3>
                  <div className="flex items-center gap-3 text-[11px] text-sub">
                    <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-brand" />중간값</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-3 bg-brand/15" />호가 범위</span>
                  </div>
                </div>
                <div className="mt-3">
                  <PriceChart market={market} />
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-line bg-paper px-5 py-12 text-center">
              <p className="display text-[30px] text-faint">NO MARKET DATA</p>
              <p className="mt-3 text-[15px] font-bold">가격 정보 없음</p>
              <p className="mx-auto mt-1 max-w-[30em] text-[13px] leading-relaxed text-sub">
                현재 비교할 수 있는 중고 매물이 없어 가격 범위를 제시하지 않습니다. 매물이 확인되면 호가 기준으로 표시됩니다.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* D. 아카이브 스토리 */}
      <section className="mt-16 bg-ivory py-14 md:mt-24 md:py-24">
        <div className="container-page">
          <p className="eyebrow text-sub">
            <span className="text-brand">04</span> — {story.kicker}
          </p>
          <h2 className="display mt-4 max-w-[9em] text-[46px] leading-[1.02] md:text-[96px]">{story.headline}</h2>
          <p className="mt-5 flex items-center gap-2 text-[12px] text-sub">
            <DemoTag>DEMO</DemoTag>
            향후 AI 에디토리얼로 자동 생성될 영역입니다. 현재는 예시 원고입니다.
          </p>

          <div className="mt-10 grid gap-10 md:mt-16 md:grid-cols-[1fr_1.1fr] md:gap-16">
            <div className="md:sticky md:top-24 md:self-start">
              <div className="-mx-5 aspect-[4/5] bg-paper md:mx-0">
                <GarmentImage spec={product.garment} view="back" label={`${product.nameKo} 뒷면`} className="h-full w-full p-[9%]" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="aspect-[4/3] overflow-hidden">
                  <GarmentImage spec={product.garment} view="detail" label="소재 디테일" className="h-full w-full" />
                </div>
                <div className="aspect-[4/3] overflow-hidden">
                  <GarmentImage spec={product.garment} view="label" label="라벨 디테일" className="h-full w-full" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-faint">
                {product.name} · {seasonLabel(product.season)} · {product.color.name}
              </p>
            </div>

            <ol className="space-y-10 md:space-y-14">
              {story.sections.map((s, i) => (
                <li key={s.label} className="border-t border-ink pt-4">
                  <div className="flex items-baseline gap-3">
                    <span className="display text-[28px] text-brand">{String(i + 1).padStart(2, "0")}</span>
                    <span className="eyebrow !text-[10px] text-sub">{s.label}</span>
                  </div>
                  <h3 className="mt-3 text-[24px] font-extrabold leading-tight tracking-[-0.03em] md:text-[32px]">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.85] text-ink md:text-[16px]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <div className="container-page">
        {/* 데모 제품에는 확인된 출처가 없어 에디토리얼을 구성하지 않는다 */}
        <EditorialUnavailable index="05" />

        {/* E. 소재와 관리 */}
        <section className="mt-16 md:mt-24">
          <SectionTitle index="06" en="Material & Care" title="소재와 관리 가이드" />
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {careBlocks.map((b) => (
              <div key={b.title} className="bg-white p-5">
                <b.icon size={22} strokeWidth={1.6} />
                <h3 className="mt-3 text-[16px] font-extrabold">{b.title}</h3>
                <ul className="mt-3 space-y-2">
                  {b.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                      <span className="mt-[9px] h-px w-2.5 shrink-0 bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* F. 수선·재판매 */}
        <section className="mt-16 md:mt-24">
          <SectionTitle
            index="07"
            en="Loop Services"
            title="수선 및 재판매"
            note="가치를 확인했다면, 이 옷의 다음 이야기를 선택해 보세요. 데모에서는 신청 접수 화면까지 체험할 수 있습니다."
          />
          <ServiceSection product={product} />
        </section>

        {/* 관련 아카이브 */}
        <section className="mt-16 md:mt-24">
          <SectionHeader eyebrow="Related" title="함께 보면 좋은 아카이브" href="/explore" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
