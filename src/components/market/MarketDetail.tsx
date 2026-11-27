"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Info, Layers, Palette, Plus, Ruler, Share2, Tag } from "lucide-react";
import { share } from "@/components/archive/DetailActions";
import { Gallery, type GalleryPhoto } from "@/components/archive/Gallery";
import { CareGuideSection, StyleThroughTime } from "@/components/archive/StyleSections";
import { LikeButton } from "@/components/product/LikeButton";
import { DemoTag, buttonLinkClass } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { CATEGORY_LABEL, cx, josa, seasonLabel, won } from "@/lib/format";
import { findListing } from "@/lib/listing";
import { productHref } from "@/lib/product-links";
import type { CurationMedia } from "@/data/demo-scan";
import { useAppState } from "@/store/app-store";
import type { CareGuide, Product } from "@/types";

/**
 * Figma 09 — 판매 상품(구매) 상세.
 * 제품 설명 · 빈티지 유형 · 스타일 · 관리 가이드는 공통 아카이브 콘텐츠를 쓰고,
 * 판매가 · 사이즈 · 상태 · 판매자만 판매 정보(listing)에서 가져온다.
 */
export function MarketDetail({
  product,
  care,
  photos,
  media,
}: {
  product: Product;
  care: CareGuide;
  /** 스캔한 옷 — 판매자가 직접 찍은 사진 (주어지면 일러스트를 쓰지 않는다) */
  photos?: GalleryPhoto[];
  /** 스캔한 옷의 큐레이션 자료 사진 */
  media?: CurationMedia | null;
}) {
  const scanned = Boolean(photos);
  const { closet } = useAppState();
  const listing = findListing(product, closet);
  const categoryLabel = CATEGORY_LABEL[product.category];

  if (!listing) {
    return (
      <div className="container-page py-20 text-center">
        <p className="display text-[40px] text-faint">NOT ON SALE</p>
        <p className="mt-3 text-[15px] font-bold">판매 중인 상품이 아니에요</p>
        <p className="mt-1 text-[13px] text-sub">아카이브 상세에서 이 옷의 정보를 볼 수 있어요.</p>
        <Link href={productHref(product.id)} className={`${buttonLinkClass.dark} mt-6`}>
          아카이브 상세 보기
        </Link>
      </div>
    );
  }

  const soldOut = listing.status === "sold_out";
  const canBuy = !soldOut && !listing.mine;
  const statusText = soldOut ? "품절 · 시연용 상품" : listing.mine ? "판매 중 · 내가 등록한 상품" : "판매 중 · 시연용 상품";

  const specs = [
    { icon: Calendar, label: "제작 연도", value: seasonLabel(product.season) },
    { icon: Layers, label: "소재", value: product.material },
    { icon: Ruler, label: "핏", value: product.fit },
    { icon: Palette, label: "색상", value: `${product.color.name} · 사이즈 ${listing.size}` },
    { icon: Tag, label: "빈티지 유형", value: product.archiveType.label, accent: true },
    { icon: Info, label: "출처 · 검증 상태", value: product.provenance.source },
  ];

  const buy = canBuy ? (
    <Link href={`/checkout/${product.id}`} className={`${buttonLinkClass.primary} flex-1 !font-medium`}>
      <Plus size={18} /> 구매하기
    </Link>
  ) : (
    <span className="inline-flex h-[52px] flex-1 items-center justify-center bg-line px-5 text-[15px] font-medium text-faint">
      {soldOut ? "품절된 상품이에요" : "내가 등록한 판매 상품이에요"}
    </span>
  );

  return (
    <article className="container-page pb-16 md:pb-24">
      {/* 경로 */}
      <nav aria-label="경로" className="flex items-center gap-1.5 pt-6 text-[12px] text-sub md:pt-8">
        <Link href="/explore" className="hover:text-ink">발견하기</Link>
        <span>/</span>
        <Link href={`/explore?category=${product.category}`} className="hover:text-ink">{categoryLabel}</Link>
        <span>/</span>
        <span className="text-ink">판매 상품 상세</span>
      </nav>

      <div className="mt-6 grid gap-8 md:mt-8 md:grid-cols-[minmax(0,528fr)_minmax(0,544fr)] md:gap-16">
        <div className="-mx-5 md:mx-0">
          <Gallery product={product} thumbnails photos={photos} />
          <p className="mx-5 mt-5 text-[13px] text-sub md:mx-0">판매자가 직접 스캔한 이미지입니다.</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center bg-ink px-2 text-[11px] font-bold tracking-wide text-white">{product.collection}</span>
            {product.verification && <VerificationBadge status={product.verification.status} branded className="!h-6" />}
            <DemoTag className="!h-6">{scanned ? "PROTOTYPE · 공식 인증 아님" : "DEMO DATA · 공식 인증 아님"}</DemoTag>
          </div>

          <h1 className="mt-8 text-[32px] font-bold leading-[1.15] tracking-[-0.035em] text-brand md:mt-11 md:text-[40px]">{product.name}</h1>
          <p className="mt-1 text-[16px] text-sub">
            {product.nameKo} · {seasonLabel(product.season)}
          </p>
          <p className="mt-4 text-[15px] leading-[1.75]">{product.description}</p>

          <div className="mt-5 border-l-[3px] border-brand bg-brand-tint px-5 py-5">
            <p className="eyebrow !text-[10px] text-brand">빈티지 유형 · Vintage Type</p>
            <p className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-brand">
              {product.archiveType.label}
              <span className="ml-2 text-[13px] font-medium">{product.archiveType.en}</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">{product.archiveType.desc}</p>
          </div>

          {/* 판매가 */}
          <div className="mt-5 flex items-end justify-between border-y border-line py-4">
            <div>
              <p className="text-[12px] text-sub">이 상품의 판매가</p>
              <p className={cx("mt-1.5 text-[24px] font-bold tracking-[-0.03em]", soldOut && "text-faint line-through")}>₩{won(listing.price)}</p>
            </div>
            <span className="flex items-center gap-0.5 text-[12px] text-sub">
              {statusText} <ChevronRight size={14} />
            </span>
          </div>

          <div className="mt-5 flex gap-2">
            {buy}
            <LikeButton productId={product.id} className="!h-[52px] !w-[52px] shrink-0 border border-line" />
            <button type="button" aria-label="공유" onClick={() => share(product)} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border border-line">
              <Share2 size={20} strokeWidth={1.8} />
            </button>
          </div>

          <dl className="mt-6 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3">
            {specs.map((s) => (
              <div key={s.label} className="border-b border-r border-line p-4">
                <s.icon size={20} strokeWidth={1.6} className={s.accent ? "text-brand" : "text-ink"} />
                <dt className="mt-3 text-[11px] text-faint">{s.label}</dt>
                <dd className="mt-0.5 text-[14px] font-bold leading-snug">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12px] leading-relaxed text-faint">프로토타입 시연용 가상 데이터입니다. 유니클로 공식 인증 정보가 아닙니다.</p>
        </div>
      </div>

      {/* 이 한 벌의 정보 */}
      <section className="mt-14 border-t border-line pt-6 md:mt-[84px] md:pt-10">
        <p className="text-[11px] font-bold text-brand">ITEM DETAILS</p>
        <h2 className="mt-4 text-[24px] font-bold tracking-[-0.03em] md:text-[30px]">구매 전, 이 한 벌을 확인하세요</h2>
        <p className="mt-4 text-[17px] font-bold md:text-[18px]">
          사이즈 {listing.size} · {product.color.name} · 상태 {listing.conditionLabel}
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-sub">
          {listing.conditionNote}
          {josa(listing.conditionNote, "이", "가")} 있는 {listing.mine ? "판매" : "시연"} 상품입니다. 상태와 사용 흔적은 판매 상품의 실제 사진으로 확인합니다.
          {listing.note && ` 판매자 전달 사항: ${listing.note}`}
        </p>
        <p className="mt-3 text-[13px] text-sub">
          판매자: {listing.seller} · 판매가 {won(listing.price)}원 · 배송·반품 조건은 구매 단계에서 확인
        </p>
        <p className="mt-3 text-[11px] text-faint">
          {listing.mine ? "이 기기에만 저장된 데모 판매 정보입니다." : "판매가와 판매자 정보는 와이어프레임 시연용 예시입니다."}
        </p>
      </section>

      {/* 스캔한 옷은 자료 사진이 있을 때만 — 플레이스홀더를 보여 주지 않는다 */}
      {(!scanned || media) && (
        <StyleThroughTime
          categoryLabel={categoryLabel}
          media={media ? { then: media.styleThen, now: media.styleNow } : null}
          className="mt-14 md:mt-[72px]"
        />
      )}

      <CareGuideSection care={care} className="mt-14 md:mt-20" />

      {/* 하단 구매 바 */}
      <div className="mt-6 flex flex-col gap-3 border-t-2 border-ink pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={cx("text-[22px] font-bold tracking-[-0.03em] md:text-[24px]", soldOut && "text-faint")}>판매가 {won(listing.price)}원</p>
        {canBuy ? (
          <Link href={`/checkout/${product.id}`} className={`${buttonLinkClass.primary} !font-medium sm:w-[300px]`}>
            구매하기
          </Link>
        ) : (
          <span className="inline-flex h-[52px] items-center justify-center bg-line px-5 text-[15px] text-faint sm:w-[300px]">
            {soldOut ? "품절" : "내 판매 상품"}
          </span>
        )}
      </div>
    </article>
  );
}
