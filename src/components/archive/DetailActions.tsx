"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Droplets, Plus, Scissors, Share2, Tag } from "lucide-react";
import { SaveToClosetModal } from "@/components/closet/SaveToClosetModal";
import { LikeButton } from "@/components/product/LikeButton";
import { Button, buttonLinkClass } from "@/components/ui/primitives";
import { productHref } from "@/lib/product-links";
import { useAppState } from "@/store/app-store";
import { toast } from "@/store/toast-store";
import type { Product, ServiceType } from "@/types";
import { ServiceModal } from "./ServiceModal";

export async function share(product: Product) {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: `${product.name} | RE:FOUND`, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("링크를 복사했어요");
  } catch {
    // 사용자가 공유를 취소한 경우 등은 조용히 넘어간다
  }
}

/** 상단 액션: 저장 / 찜 / 공유 + 모바일 하단 고정 바 (desktop=false 면 모바일 바만) */
export function PrimaryActions({ product, desktop = true }: { product: Product; desktop?: boolean }) {
  const { closet } = useAppState();
  const [open, setOpen] = useState(false);
  const saved = closet.some((e) => e.productId === product.id);

  const saveButton = saved ? (
    <Link href="/my" className={`${buttonLinkClass.outline} flex-1`}>
      <Check size={18} className="text-brand" />
      옷장에 저장됨
    </Link>
  ) : (
    <Button className="flex-1" onClick={() => setOpen(true)}>
      <Plus size={18} />
      나의 옷장에 저장
    </Button>
  );

  return (
    <>
      <div className={desktop ? "hidden items-center gap-2 md:flex" : "hidden"}>
        {saveButton}
        <LikeButton productId={product.id} className="!h-[52px] !w-[52px] border border-line" />
        <button type="button" aria-label="공유" onClick={() => share(product)} className="flex h-[52px] w-[52px] items-center justify-center border border-line">
          <Share2 size={20} strokeWidth={1.8} />
        </button>
      </div>

      {/* 모바일 고정 바 (하단 탭 위) */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 border-t border-line bg-white px-5 py-2.5 md:hidden">
        <LikeButton productId={product.id} className="!h-[52px] !w-[52px] shrink-0 border border-line" />
        <button type="button" aria-label="공유" onClick={() => share(product)} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border border-line">
          <Share2 size={20} strokeWidth={1.8} />
        </button>
        {saveButton}
      </div>

      <SaveToClosetModal open={open} onClose={() => setOpen(false)} product={product} />
    </>
  );
}

const SERVICES: { type: ServiceType; icon: typeof Tag; title: string; body: string; cta: string }[] = [
  {
    type: "cleaning",
    icon: Droplets,
    title: "클리닝 상담",
    body: "얼룩·냄새·보풀 등 오래된 옷에 맞는 세탁 방법을 상담합니다.",
    cta: "상담 신청",
  },
  {
    type: "repair",
    icon: Scissors,
    title: "수선 / 리워크",
    body: "지퍼 교체, 부분 보수, 패치 리워크로 더 오래 입을 수 있습니다.",
    cta: "수선 신청",
  },
  {
    type: "resale",
    icon: Tag,
    title: "재판매 등록",
    body: "매물 호가를 참고해 가격을 정하고 다음 주인을 찾아 줍니다.",
    cta: "판매 등록",
  },
];

export function ServiceSection({ product }: { product: Product }) {
  const [type, setType] = useState<ServiceType | null>(null);
  return (
    <>
      <ul className="grid gap-px border border-brand bg-line md:grid-cols-3">
        {SERVICES.map((s) => {
          const className = "group flex h-full w-full items-start gap-4 p-5 text-left transition-colors hover:bg-brand-tint md:flex-col md:p-6";
          const inner = (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-ink text-white transition-colors group-hover:bg-brand">
                <s.icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-extrabold">{s.title}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-sub">{s.body}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-brand">
                  {s.cta} <ArrowRight size={14} />
                </span>
              </span>
            </>
          );
          return (
            <li key={s.type} className="bg-white">
              {/* 재판매는 판매 정보 작성 화면(Figma 10)으로, 클리닝 · 수선은 신청 모달로 */}
              {s.type === "resale" ? (
                <Link href={productHref(product.id, "sell")} className={className}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={() => setType(s.type)} className={className}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <ServiceModal type={type} onClose={() => setType(null)} product={product} />
    </>
  );
}
