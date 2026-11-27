import Link from "next/link";
import { Calendar, ChevronRight, Info, Layers, Palette, Ruler, Tag } from "lucide-react";
import { PrimaryActions, ServiceSection } from "@/components/archive/DetailActions";
import { FromScanProgress } from "@/components/archive/FromScanProgress";
import { Gallery, type GalleryPhoto } from "@/components/archive/Gallery";
import { SectionTitle } from "@/components/archive/SectionTitle";
import { CareGuideSection, StyleThroughTime } from "@/components/archive/StyleSections";
import { PriceChart } from "@/components/charts/PriceChart";
import { RadarChart } from "@/components/charts/RadarChart";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { CertificateLauncher } from "@/components/certificate/CertificateLauncher";
import { ScanProgress } from "@/components/scan/ScanSidebar";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { DemoTag } from "@/components/ui/primitives";
import { CATEGORY_LABEL, priceRange, seasonLabel, won } from "@/lib/format";
import { VERIFICATION_STATUS, toCertificate } from "@/lib/verification";
import type { CurationImage, CurationMedia } from "@/data/demo-scan";
import type { CareGuide, GarmentView, Product } from "@/types";

/**
 * Figma 05 아카이브 상세.
 * - variant "demo": 데모 상품 (/archive/[id]) — 일러스트 이미지
 * - variant "scan": 실제 스캔 결과 (/archive/scan/?session=) — 내가 찍은 사진 + AI 큐레이션
 *   시연용이므로 일러스트 · 플레이스홀더를 쓰지 않는다. 자료가 없는 칸은 비워 두지 않고 영역째 숨긴다.
 *   위쪽 갤러리 = 내가 찍은 사진, 아래 큐레이션(스토리 · 스타일) = 상품 DB 자료 사진(잡지 사진)만.
 */
export function ProductDetail({
  product,
  care,
  variant = "demo",
  photos,
  media,
}: {
  product: Product;
  care: CareGuide;
  variant?: "demo" | "scan";
  photos?: GalleryPhoto[];
  /** 큐레이션 자료 사진 (스타일 · 상세) — 실제 서비스에서는 상품 DB에서 온다 */
  media?: CurationMedia | null;
}) {
  const scan = variant === "scan";
  const { market, story, verification } = product;
  const certificate = toCertificate(product);
  const status = verification ? VERIFICATION_STATUS[verification.status] : null;
  const categoryLabel = CATEGORY_LABEL[product.category];

  const specs = [
    { icon: Calendar, label: "제작 연도", value: seasonLabel(product.season) },
    { icon: Layers, label: "소재", value: product.material },
    { icon: Ruler, label: "핏", value: product.fit },
    { icon: Palette, label: "색상", value: `${product.color.name}${product.color.others ? ` ${product.color.others}` : ""}` },
    { icon: Tag, label: "빈티지 유형", value: product.archiveType.label, accent: true },
    { icon: Info, label: "출처 · 검증 상태", value: product.provenance.source },
  ];

  const storyImage = (view: GarmentView, label: string, className: string) => (
    <GarmentImage spec={product.garment} view={view} label={label} className={className} />
  );
  const mediaImage = (m: CurationImage) => (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기
    <img src={m.src} alt={m.alt} className="h-full w-full object-cover object-top" />
  );
  // 스캔 결과에서 스토리 옆 이미지 칸은 자료 사진이 있을 때만 둔다
  const showStoryImages = !scan || Boolean(media);

  return (
    <article data-action-bar>
      <div className="container-page">
        {/* 경로 */}
        <nav aria-label="경로" className="flex h-11 items-center gap-1 text-[12px] text-sub">
          <Link href={scan ? "/my" : "/explore"} className="hover:text-ink">{scan ? "나의 옷장" : "아카이브"}</Link>
          <ChevronRight size={12} />
          {scan ? (
            <span>{categoryLabel}</span>
          ) : (
            <Link href={`/explore?category=${product.category}`} className="hover:text-ink">
              {categoryLabel}
            </Link>
          )}
          <ChevronRight size={12} />
          <span className="truncate text-ink">{product.name}</span>
        </nav>

        {scan ? <ScanProgress active={2} variant="result" className="mt-3 md:mt-6" /> : <FromScanProgress className="mt-3 md:mt-6" />}

        {/* 01 검증 상태 */}
        <section id="verification" className="mt-10 scroll-mt-24 md:mt-[70px]">
          <p className="eyebrow text-sub">
            <span className="text-brand">01</span> —Status
          </p>
          <h1 className="mt-3 text-[24px] font-bold tracking-[-0.03em] md:text-[28px]">
            {scan ? "분석 완료 · 검증 요청 전" : status?.label ?? "인증 이력 없음"}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-sub">
            {scan
              ? "촬영한 사진으로 이 옷의 아카이브 정보를 정리했습니다. 정품 인증서는 RE:FOUND 검수를 마친 뒤 발급됩니다."
              : verification?.status === "in_review" && verification.expectedAt
                ? `${status?.desc} 예상 완료일 ${verification.expectedAt}`
                : verification?.status === "needs_review" && verification.note
                  ? verification.note
                  : status?.desc ?? "아직 검증을 요청하지 않은 아카이브입니다. 스캔하고 검증을 요청할 수 있습니다."}
          </p>
          {!scan && (
            <div className="mt-8 md:mt-14">
              {certificate ? (
                <CertificateLauncher certificate={certificate} />
              ) : (
                <Link href="/scan" className="inline-flex h-11 items-center gap-1 text-[13px] font-bold text-brand">
                  스캔하고 검증 요청하기 <ChevronRight size={14} />
                </Link>
              )}
            </div>
          )}
        </section>

        {/* 제품 요약 */}
        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,528fr)_minmax(0,544fr)] md:gap-16">
          <div className="-mx-5 md:mx-0">
            <div className="md:sticky md:top-24">
              <Gallery product={product} photos={photos} />
              {/* 기본 정보 */}
              <dl className="mx-5 mt-2.5 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 md:mx-0">
                {specs.map((s) => (
                  <div key={s.label} className="border-b border-r border-line p-4">
                    <s.icon size={20} strokeWidth={1.6} className={s.accent ? "text-brand" : "text-ink"} />
                    <dt className="mt-3 text-[11px] text-faint">{s.label}</dt>
                    <dd className="mt-0.5 text-[14px] font-bold leading-snug">{s.value}</dd>
                  </div>
                ))}
              </dl>
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
              {verification && (
                <a href="#verification" aria-label="검증 상태로 이동">
                  <VerificationBadge status={verification.status} branded className="!h-6" />
                </a>
              )}
              <DemoTag className="!h-6">{scan ? "PROTOTYPE · 공식 인증 아님" : "DEMO DATA · 공식 인증 아님"}</DemoTag>
            </div>

            <h2 className="mt-5 text-[36px] font-bold leading-[1.1] tracking-[-0.035em] text-brand md:text-[56px]">{product.name}</h2>
            <p className="mt-3 text-[16px] text-sub">
              {product.nameKo} · {seasonLabel(product.season)}
            </p>

            {/* 가격 요약 */}
            <a href="#market" className="mt-5 flex items-end justify-between border-y border-line py-5">
              <div>
                <p className="text-[12px] text-sub">중고 매물 호가 범위</p>
                <p className="mt-1.5 text-[24px] font-bold tracking-[-0.03em]">
                  {market ? priceRange(market) : <span className="text-faint">가격 정보 없음</span>}
                </p>
              </div>
              <span className="flex items-center gap-0.5 text-[12px] text-sub">
                {market ? `매물 ${market.listings}건` : "매물 없음"} <ChevronRight size={14} />
              </span>
            </a>

            <p className="mt-5 text-[15px] leading-[1.75]">{product.description}</p>

            {/* 빈티지 유형 */}
            <div className="mt-5 border-l-[3px] border-brand bg-brand-tint px-5 py-5">
              <p className="eyebrow !text-[10px] text-brand">빈티지 유형 · Vintage Type</p>
              <p className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-brand">
                {product.archiveType.label}
                <span className="ml-2 text-[13px] font-medium">{product.archiveType.en}</span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">{product.archiveType.desc}</p>
            </div>

            {/* 다섯 가지 가치 */}
            <div className="mx-auto mt-4 max-w-[420px]">
              <RadarChart evaluation={product.evaluation} />
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-faint">
              {scan
                ? "프로토타입에서는 유니클로 상품 DB 대신 AI가 사진을 분석해 작성했습니다. 유니클로 공식 인증 정보가 아닙니다."
                : "프로토타입 시연용 가상 데이터입니다. 유니클로 공식 인증 정보가 아닙니다."}
            </p>

            {/* 디자인에 없는 데스크톱 버튼은 숨기고, 모바일 하단 고정 바(옷장 저장 · 찜 · 공유)만 남긴다 */}
            <PrimaryActions product={product} desktop={false} />
          </div>
        </div>

        {/* 확인한 상태 */}
        <div className="mt-16 border border-line p-5 md:mt-[180px] md:p-6">
          <h2 className="text-[18px] font-bold md:text-[20px]">확인한 상태 · {product.condition.label}</h2>
          <p className="mt-3 text-[14px] leading-relaxed">{product.condition.notes.join(" · ")}</p>
          <p className="mt-2 text-[12px] leading-relaxed">
            {scan ? "촬영한 사진으로 확인한 상태입니다. 별도 검수·인증 상태와 구분됩니다." : "아카이브 기준 샘플의 상태입니다. 별도 검수·인증 상태와 구분됩니다."}
          </p>
        </div>

        {/* 02 수선 · 재판매 */}
        <section>
          <SectionTitle
            index="02"
            en="Loop Services"
            title="수선 및 재판매"
            note="가치를 확인했다면, 이 옷의 다음 이야기를 선택해 보세요. 데모에서는 신청 접수 화면까지 체험할 수 있습니다."
          />
          <ServiceSection product={product} />
        </section>

        {/* 03 시장 가치 */}
        <section id="market" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle index="03" en="Market Value" title="시장 가치" />
          {market ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
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
                  판매자가 올린 호가를 모은 값이며 실제 거래가 성사된 가격이 아닙니다. 상태와 사이즈에 따라 달라질 수 있습니다. ({scan ? "프로토타입 데이터" : "데모 데이터"})
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

      <div className="mt-16 bg-ivory pb-16 pt-14 md:mt-24 md:pb-24 md:pt-24">
        {/* 04 아카이브 스토리 */}
        <section className="container-page">
          <p className="eyebrow text-sub">
            <span className="text-brand">04</span> — {story.kicker}
          </p>
          <h2 className="display mt-4 max-w-[9em] text-[46px] leading-[1.02] md:text-[96px]">{story.headline}</h2>
          {!scan && (
            <p className="mt-5 flex items-center gap-2 text-[12px] text-sub">
              <DemoTag>DEMO</DemoTag>
              향후 AI 에디토리얼로 자동 생성될 영역입니다. 현재는 예시 원고입니다.
            </p>
          )}

          <div className={showStoryImages ? "mt-10 grid gap-10 md:mt-16 md:grid-cols-[1fr_1.1fr] md:gap-16" : "mt-10 max-w-[760px] md:mt-16"}>
            {media ? (
              /* 잡지 화보처럼 — 큰 착용 컷 + 어긋나게 놓인 두 번째 컷 */
              <figure className="md:sticky md:top-24 md:self-start">
                <div className="-mx-5 aspect-[4/5] overflow-hidden bg-paper md:mx-0">{mediaImage(media.details[0])}</div>
                <div className="ml-auto mt-3 aspect-[4/5] w-[62%] overflow-hidden bg-paper md:-mt-24 md:w-[48%] md:border-[6px] md:border-ivory">
                  {mediaImage(media.details[1])}
                </div>
                <figcaption className="mt-3 text-[11px] leading-relaxed text-faint">
                  {product.name} · {seasonLabel(product.season)} · {media.details[0].source.replace("출처: ", "")}
                </figcaption>
              </figure>
            ) : (
              showStoryImages && (
                <div className="md:sticky md:top-24 md:self-start">
                  <div className="-mx-5 aspect-[4/5] overflow-hidden bg-paper md:mx-0">
                    {storyImage("back", `${product.nameKo} 뒷면`, "h-full w-full p-[9%]")}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="aspect-[4/3] overflow-hidden">{storyImage("detail", "소재 디테일", "h-full w-full")}</div>
                    <div className="aspect-[4/3] overflow-hidden">{storyImage("label", "라벨 디테일", "h-full w-full")}</div>
                  </div>
                  <p className="mt-2 text-[11px] text-faint">
                    {product.name} · {seasonLabel(product.season)} · {product.color.name}
                  </p>
                </div>
              )
            )}

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
        </section>

        {/* 그때의 옷, 지금의 스타일 — 스캔 결과는 자료 사진이 없으면 플레이스홀더 대신 영역을 숨긴다 */}
        {(!scan || media) && (
          <StyleThroughTime
            categoryLabel={categoryLabel}
            media={media ? { then: media.styleThen, now: media.styleNow } : null}
            className="container-page mt-16 md:mt-20"
          />
        )}

        {/* 05 소재와 관리 */}
        <CareGuideSection care={care} className="container-page mt-12" />
      </div>
    </article>
  );
}
