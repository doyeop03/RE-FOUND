"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonLinkClass } from "@/components/ui/primitives";
import { Consent, Field, Segmented, inputClass } from "@/components/ui/Form";
import { LISTINGS } from "@/data/listings";
import { won } from "@/lib/format";
import { DEAL_METHOD_LABEL, DEFAULT_SHIPPING } from "@/lib/listing";
import { registerResale, useAppState } from "@/store/app-store";
import { toast } from "@/store/toast-store";
import type { DealMethod, Product } from "@/types";

/** 기본 판매가 — 이미 등록한 값 → 시연용 판매가 → 매물 호가 범위의 가운데 순서 */
function defaultPrice(product: Product, asking?: number) {
  if (asking) return asking;
  const demo = LISTINGS.find((l) => l.productId === product.id)?.price;
  if (demo) return demo;
  if (product.market) return Math.round((product.market.low + product.market.high) / 2 / 1000) * 1000;
  return 0;
}

/**
 * Figma 10 — 판매 정보 작성.
 * 제품 설명 · 빈티지 유형 · 스타일 자료는 공통 아카이브 콘텐츠를 쓰고, 판매자는 가격과 거래 정보만 적는다.
 */
export function SellForm({ product }: { product: Product }) {
  const router = useRouter();
  const { closet } = useAppState();
  const entry = closet.find((e) => e.productId === product.id);
  const demo = LISTINGS.find((l) => l.productId === product.id);

  const [price, setPrice] = useState(() => {
    const p = defaultPrice(product, entry?.askingPrice);
    return p ? won(p) : "";
  });
  const [size, setSize] = useState(entry?.listing?.size ?? demo?.size ?? "");
  const [method, setMethod] = useState<DealMethod>(entry?.listing?.method ?? "parcel");
  const [shipping, setShipping] = useState(entry?.listing?.shipping ?? DEFAULT_SHIPPING);
  const [note, setNote] = useState(entry?.listing?.note ?? "");
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);

  const priceNumber = Number(price.replace(/[^0-9]/g, ""));
  const errors = {
    price: priceNumber > 0 ? null : "판매 가격을 입력해 주세요.",
    size: size.trim() ? null : "사이즈를 입력해 주세요.",
    shipping: shipping.trim() ? null : method === "parcel" ? "배송 조건을 입력해 주세요." : "직거래 희망 지역을 입력해 주세요.",
    agreed: agreed ? null : "촬영 결과와 실제 상태를 확인한 뒤 체크해 주세요.",
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null);

  const changeMethod = (m: DealMethod) => {
    setMethod(m);
    // 기본 배송 문구는 직거래에 맞지 않으므로 비운다
    if (m === "direct" && shipping === DEFAULT_SHIPPING) setShipping("");
    if (m === "parcel" && !shipping.trim()) setShipping(DEFAULT_SHIPPING);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    registerResale({
      productId: product.id,
      askingPrice: priceNumber,
      conditionLabel: entry?.conditionLabel ?? product.condition.label,
      listing: {
        size: size.trim(),
        method,
        shipping: shipping.trim(),
        shippingFee: method === "parcel" ? 3000 : 0,
        note: note.trim() || undefined,
      },
    });
    toast("판매 등록을 마쳤어요");
    router.push(`/sell/${product.id}/done`);
  };

  const preview = [
    `판매가 ${priceNumber ? `${won(priceNumber)}원` : "미입력"} · ${size.trim() || "사이즈 미입력"}`,
    method === "parcel" ? `${DEAL_METHOD_LABEL.parcel} · 배송비 3,000원` : `${DEAL_METHOD_LABEL.direct} · ${shipping.trim() || "희망 지역 미입력"}`,
    note.trim() || "추가 하자와 전달 사항",
  ];

  return (
    <div className="container-page pb-16 pt-8 md:pb-24 md:pt-[56px]">
      <p className="text-[11px] font-bold text-brand">RESALE · SIMPLE LISTING</p>
      <h1 className="mt-5 text-[26px] font-bold leading-[1.3] tracking-[-0.03em] md:mt-7 md:text-[36px]">상세 설명은 유니클로가, 판매 정보만 간단히</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-sub md:mt-7 md:text-[15px]">
        제품 소개·빈티지 유형·당시와 현재의 스타일 자료는 유니클로가 제공합니다. 판매자는 이 한 벌의 가격과 거래 정보만 작성해 주세요.
      </p>

      <div className="mt-8 grid gap-10 md:mt-6 md:grid-cols-2 md:gap-12">
        <form onSubmit={submit} noValidate className="flex flex-col gap-[34px]">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[24px]">판매자가 작성할 정보</h2>

          <Field label="판매 가격" required help="금액은 시연용 입력 예시입니다. 판매 가격은 판매자가 정해요." error={show("price")}>
            {(id) => (
              <div className="relative">
                <input
                  id={id}
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                    setPrice(n ? won(n) : "");
                  }}
                  placeholder="0"
                  className={`${inputClass} pr-12`}
                />
                {/* 입력한 금액 바로 뒤에 '원'을 붙여 보이게 한다 */}
                {price && (
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 whitespace-pre text-[16px] text-transparent" aria-hidden>
                    {price}
                    <span className="text-ink"> 원</span>
                  </span>
                )}
              </div>
            )}
          </Field>

          <Field label="사이즈 확인" required help="라벨에서 불러온 사이즈를 확인하고, 필요하면 수정하세요." error={show("size")}>
            {(id) => <input id={id} value={size} onChange={(e) => setSize(e.target.value)} placeholder="예: L" className={inputClass} />}
          </Field>

          <Field label="거래 방식" required help="택배 선택 시 배송비·발송 예정일, 직거래 선택 시 희망 지역을 입력해요.">
            {(id) => (
              <Segmented
                id={id}
                label="거래 방식"
                value={method}
                onChange={changeMethod}
                options={[
                  { value: "parcel", label: DEAL_METHOD_LABEL.parcel },
                  { value: "direct", label: DEAL_METHOD_LABEL.direct },
                ]}
              />
            )}
          </Field>

          <Field
            label={method === "parcel" ? "배송 조건" : "직거래 희망 지역"}
            required
            help={method === "parcel" ? "현재 화면은 택배 배송을 선택한 예시입니다." : "만날 수 있는 지역과 시간대를 적어 주세요."}
            error={show("shipping")}
          >
            {(id) => (
              <input
                id={id}
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                placeholder={method === "parcel" ? DEFAULT_SHIPPING : "예: 성수역 인근 · 평일 저녁"}
                className={inputClass}
              />
            )}
          </Field>

          <Field label="추가 하자·전달 사항 (선택)" help="상품 소개나 코디 설명을 새로 작성할 필요는 없어요.">
            {(id) => (
              <input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="추가로 알고 있는 하자를 입력해 주세요." className={inputClass} />
            )}
          </Field>

          <Consent checked={agreed} onChange={setAgreed} error={show("agreed")}>
            촬영 결과와 실제 상태가 맞는지 확인했으며, 알고 있는 하자를 모두 기재했습니다.
          </Consent>

          <div className="-mt-2 flex flex-col gap-6">
            <button type="submit" className={`${buttonLinkClass.primary} !font-medium`}>
              확인하고 판매 등록하기
            </button>
            <Link href={`/archive/${product.id}`} className="inline-flex h-14 items-center justify-center border border-[#cfcfcf] text-[16px] font-bold transition-colors hover:border-ink">
              상태 스캔 결과로 돌아가기
            </Link>
          </div>
        </form>

        {/* 미리보기 */}
        <aside className="self-start border border-line p-6">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[24px]">상세 페이지는 이렇게 완성돼요</h2>
          <p className="mt-7 text-[22px] font-bold tracking-[-0.02em]">{product.name}</p>
          <p className="mt-4 text-[14px] text-sub">
            {product.color.name} · 사이즈 {size.trim() || "-"} · {product.archiveType.label}
          </p>

          <div className="mt-5 bg-ivory p-4">
            <p className="text-[13px] font-bold text-brand">UNIQLO 제공 · 공통 제품 콘텐츠</p>
            <ul className="mt-3 space-y-1 text-[14px] text-sub">
              <li>제품 설명과 브랜드 아카이브</li>
              <li>소재·제품 특징과 빈티지 유형</li>
              <li>당시 잡지·모델 착장 / 최근 스타일링</li>
              <li>소재 및 관리 가이드</li>
            </ul>
          </div>

          <div className="mt-5 bg-paper p-4">
            <p className="text-[13px] font-bold">내 상품에서 자동 반영 · 확인 필요</p>
            <ul className="mt-3 space-y-1 text-[14px] text-sub">
              <li>등록한 상품 사진과 상태 스캔 사진</li>
              {product.condition.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-[13px] font-bold">판매자 입력 · 거래 조건</p>
          <ul className="mt-4 space-y-1 text-[14px] text-sub">
            {preview.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <p className="mt-6 text-[12px] leading-relaxed text-faint">
            상태 결과는 판매자가 확인·수정할 수 있어요. 실제 판매 상품 정보와 공통 아카이브 설명은 구분해 표시합니다.
          </p>
        </aside>
      </div>
    </div>
  );
}
