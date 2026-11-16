"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button, DemoTag, buttonLinkClass } from "@/components/ui/primitives";
import { cx, priceRange, won } from "@/lib/format";
import { logActivity, registerResale } from "@/store/app-store";
import type { Product, ServiceType } from "@/types";

/**
 * 클리닝 / 수선·리워크 / 재판매 신청 UI.
 * 실제 결제·업체 연동은 없고, 접수 내용을 로컬 상태에만 기록한다.
 * 향후 POST /services/requests 로 교체할 지점은 submit() 하나뿐이다.
 */

const CONFIG: Record<ServiceType, { title: string; eyebrow: string; intro: string; options: string[]; cta: string }> = {
  cleaning: {
    title: "클리닝 상담",
    eyebrow: "Cleaning",
    intro: "오래된 옷에 맞는 세탁 방법을 상담해 드려요. 신경 쓰이는 부분을 골라 주세요.",
    options: ["전체 클리닝", "얼룩 제거", "냄새 제거", "보풀 정리"],
    cta: "상담 신청하기",
  },
  repair: {
    title: "수선 / 리워크 신청",
    eyebrow: "Repair & Rework",
    intro: "상태에 따라 수선하거나 리워크해서 더 오래, 새롭게 입을 수 있어요.",
    options: ["지퍼·단추 교체", "부분 보수", "기장·품 수선", "패치·자수 리워크"],
    cta: "수선 신청하기",
  },
  resale: {
    title: "재판매 등록",
    eyebrow: "Resale",
    intro: "다음 주인을 찾아 주세요. 매물 호가를 참고해 희망 가격을 정할 수 있어요.",
    options: ["최상", "양호", "보통", "사용감 있음"],
    cta: "재판매 등록하기",
  },
};

interface Props {
  type: ServiceType | null;
  onClose: () => void;
  product: Product;
}

export function ServiceModal({ type, onClose, product }: Props) {
  return (
    <Modal
      open={type !== null}
      onClose={onClose}
      title={type ? CONFIG[type].title : ""}
      eyebrow={type ? CONFIG[type].eyebrow : undefined}
    >
      {type && <ServiceForm key={type} type={type} product={product} onClose={onClose} />}
    </Modal>
  );
}

function ServiceForm({ type, product, onClose }: { type: ServiceType; product: Product; onClose: () => void }) {
  const cfg = CONFIG[type];
  const suggested = product.market ? Math.round((product.market.low + product.market.high) / 2000) * 1000 : 0;

  const [selected, setSelected] = useState<string[]>(type === "resale" ? [product.condition.label] : []);
  const [memo, setMemo] = useState("");
  const [price, setPrice] = useState(suggested ? String(suggested) : "");
  const [receipt, setReceipt] = useState<string | null>(null);

  const priceNumber = Number(price.replace(/[^0-9]/g, ""));
  const valid = type === "resale" ? priceNumber > 0 && selected.length === 1 : selected.length > 0;

  const toggle = (option: string) => {
    if (type === "resale") {
      setSelected([option]);
      return;
    }
    setSelected((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  };

  const submit = () => {
    if (!valid) return;
    if (type === "resale") {
      registerResale({ productId: product.id, askingPrice: priceNumber, conditionLabel: selected[0] });
    } else {
      logActivity(
        type,
        product.id,
        type === "cleaning" ? `클리닝 상담을 신청했어요 (${selected.join(", ")})` : `수선·리워크를 신청했어요 (${selected.join(", ")})`,
      );
    }
    setReceipt(`RF-${Date.now().toString().slice(-6)}`);
  };

  if (receipt) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center bg-brand text-white">
          <Check size={28} strokeWidth={2.5} />
        </span>
        <p className="mt-4 text-[20px] font-extrabold tracking-[-0.02em]">접수가 완료되었어요</p>
        <p className="mt-1 text-[13px] text-sub">{product.name}</p>
        <dl className="mt-5 divide-y divide-line border-y border-line text-left text-[14px]">
          <div className="flex justify-between py-3">
            <dt className="text-sub">접수 번호</dt>
            <dd className="font-bold">{receipt}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="shrink-0 text-sub">{type === "resale" ? "제품 상태" : "신청 항목"}</dt>
            <dd className="text-right font-bold">{selected.join(", ")}</dd>
          </div>
          {type === "resale" && (
            <div className="flex justify-between py-3">
              <dt className="text-sub">희망 판매가</dt>
              <dd className="font-bold">₩{won(priceNumber)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 flex items-start gap-2 text-left text-[12px] leading-relaxed text-faint">
          <DemoTag className="shrink-0" />
          데모 접수입니다. 실제 업체로 전달되거나 결제가 이루어지지 않으며, 내역은 나의 옷장 &gt; 기록에서 확인할 수 있어요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Link href={type === "resale" ? "/my?tab=selling" : "/my?tab=log"} className={buttonLinkClass.dark}>
            {type === "resale" ? "판매 중 보기" : "기록 보기"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[14px] leading-relaxed text-sub">{cfg.intro}</p>

      <p className="mb-2 mt-5 text-[13px] font-bold">
        {type === "resale" ? "제품 상태" : "신청 항목 (복수 선택)"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cfg.options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(o)}
              className={cx(
                "flex h-12 items-center justify-between border px-3 text-[14px] font-semibold transition-colors",
                active ? "border-brand bg-brand-tint text-brand" : "border-line hover:border-ink",
              )}
            >
              {o}
              {active && <Check size={16} />}
            </button>
          );
        })}
      </div>

      {type === "resale" && (
        <label className="mt-5 block">
          <span className="mb-1.5 block text-[13px] font-bold">희망 판매가</span>
          <span className="flex h-12 items-center border border-line px-3 focus-within:border-ink">
            <span className="mr-1 text-[15px] font-bold">₩</span>
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="w-full bg-transparent text-[16px] font-bold outline-none"
            />
          </span>
          <span className="mt-1.5 block text-[12px] text-sub">
            {product.market
              ? `참고: 현재 매물 호가 ${priceRange(product.market)} (실거래가 아님)`
              : "참고할 수 있는 매물 호가 데이터가 없어요."}
          </span>
        </label>
      )}

      {type !== "resale" && (
        <label className="mt-5 block">
          <span className="mb-1.5 block text-[13px] font-bold">요청 사항 (선택)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="예: 왼쪽 소매 끝 보풀이 심해요"
            className="w-full resize-none border border-line p-3 text-[15px] outline-none focus:border-ink"
          />
        </label>
      )}

      <Button className="mt-6 w-full" disabled={!valid} onClick={submit}>
        {cfg.cta}
      </Button>
    </div>
  );
}
