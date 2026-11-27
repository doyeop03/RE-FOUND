"use client";

import Link from "next/link";
import { buttonLinkClass } from "@/components/ui/primitives";
import { productHref } from "@/lib/product-links";
import { won } from "@/lib/format";
import { findListing, shippingFeeOf } from "@/lib/listing";
import { useAppState } from "@/store/app-store";
import type { Product } from "@/types";

/** 완료 화면 공통 틀 — 가운데 정렬 머리말 · 요약 상자 · 버튼 두 개 (Figma 11) */
function DoneLayout({
  eyebrow,
  title,
  sub,
  children,
  primary,
  secondary,
  note,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  note: string;
}) {
  return (
    <div className="container-page flex flex-col items-center pb-16 pt-10 text-center md:pb-[140px] md:pt-[66px]">
      <p className="text-[12px] font-bold text-brand">{eyebrow}</p>
      <h1 className="mt-6 text-[26px] font-bold tracking-[-0.03em] md:mt-7 md:text-[36px]">{title}</h1>
      <p className="mt-4 text-[14px] text-sub md:mt-6 md:text-[15px]">{sub}</p>
      <div className="mt-8 w-full max-w-[760px] bg-ivory p-6 text-left md:px-8 md:py-9">{children}</div>
      <div className="mt-7 grid w-full max-w-[744px] gap-3 sm:grid-cols-2 sm:gap-6">
        <Link href={primary.href} className={`${buttonLinkClass.primary} !font-medium`}>
          {primary.label}
        </Link>
        <Link href={secondary.href} className="inline-flex h-[52px] items-center justify-center border border-[#cfcfcf] text-[16px] transition-colors hover:border-ink">
          {secondary.label}
        </Link>
      </div>
      <p className="mt-8 text-[12px] text-faint">{note}</p>
    </div>
  );
}

/** Figma 11 — 판매 등록 완료 */
export function SellDone({ product }: { product: Product }) {
  const { closet } = useAppState();
  const listing = findListing(product, closet);
  const mine = listing?.mine ? listing : null;
  return (
    <DoneLayout
      eyebrow="LISTED · DEMO"
      title="이 옷의 다음 이야기가 시작됐어요"
      sub="판매 등록이 완료된 상태의 시연 화면입니다."
      primary={{ href: productHref(product.id, "market"), label: "등록한 상품 상세 보기" }}
      secondary={{ href: "/my?tab=selling", label: "나의 옷장으로" }}
      note="프로토타입용 완료 상태이며 실제 등록·거래·결제 데이터는 생성되지 않습니다."
    >
      <p className="text-[24px] font-bold tracking-[-0.02em] md:text-[26px]">{product.name}</p>
      <p className="mt-4 text-[15px]">
        {product.archiveType.label} · {product.color.name}
        {mine && ` · ${mine.size}`}
      </p>
      <p className="mt-5 text-[20px] font-bold md:text-[22px]">{mine ? `판매가 ${won(mine.price)}원` : "판매 정보를 찾을 수 없어요"}</p>
      <p className="mt-5 text-[14px] leading-relaxed text-sub">
        {mine
          ? "유니클로 제공 아카이브·스타일 자료와 내 상품의 상태 스캔 결과가 함께 반영됩니다."
          : "판매 등록은 이 기기의 브라우저에만 저장돼요. 다른 기기에서는 보이지 않아요."}
      </p>
    </DoneLayout>
  );
}

/** 결제 완료 — Figma 13 시안을 받기 전 임시 화면 (11 판매 등록 완료와 같은 틀) */
export function CheckoutDone({ product }: { product: Product }) {
  const { closet } = useAppState();
  const listing = findListing(product, closet);
  const total = listing ? listing.price + shippingFeeOf(listing) : null;
  return (
    <DoneLayout
      eyebrow="ORDERED · DEMO"
      title="주문이 완료됐어요"
      sub="결제가 완료된 상태의 시연 화면입니다."
      primary={{ href: "/explore", label: "다른 아카이브 둘러보기" }}
      secondary={{ href: "/my", label: "나의 옷장으로" }}
      note="프로토타입용 완료 상태이며 실제 주문·결제는 발생하지 않습니다."
    >
      <p className="text-[24px] font-bold tracking-[-0.02em] md:text-[26px]">{product.name}</p>
      <p className="mt-4 text-[15px]">
        {product.archiveType.label} · {product.color.name}
        {listing && ` · ${listing.size}`}
      </p>
      <p className="mt-5 text-[20px] font-bold md:text-[22px]">{total !== null ? `총 결제 금액 ${won(total)}원` : "주문 정보를 찾을 수 없어요"}</p>
      <p className="mt-5 text-[14px] leading-relaxed text-sub">구매한 옷은 받은 뒤 스캔해서 나의 옷장에 기록할 수 있어요.</p>
    </DoneLayout>
  );
}
