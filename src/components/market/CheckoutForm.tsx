"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonLinkClass } from "@/components/ui/primitives";
import { Consent, Field, Segmented, inputClass } from "@/components/ui/Form";
import { won } from "@/lib/format";
import { productHref } from "@/lib/product-links";
import { findListing, shippingFeeOf } from "@/lib/listing";
import { useAppState } from "@/store/app-store";
import type { Product } from "@/types";

type PayMethod = "card" | "easy";

/** Figma 12 — 주문 · 결제 (시연용 · 실제 결제 없음) */
export function CheckoutForm({ product }: { product: Product }) {
  const router = useRouter();
  const { closet } = useAppState();
  const listing = findListing(product, closet);

  const [receiver, setReceiver] = useState("홍길동 · 010-0000-0000");
  const [address, setAddress] = useState("");
  const [request, setRequest] = useState("문 앞에 놓아주세요.");
  const [pay, setPay] = useState<PayMethod>("card");
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);

  if (!listing || listing.status !== "on_sale" || listing.mine) {
    return (
      <div className="container-page py-20 text-center">
        <p className="display text-[40px] text-faint">NOT AVAILABLE</p>
        <p className="mt-3 text-[15px] font-bold">
          {listing?.mine ? "내가 등록한 판매 상품은 구매할 수 없어요" : listing?.status === "sold_out" ? "품절된 상품이에요" : "판매 중인 상품이 아니에요"}
        </p>
        <Link href={`/archive/${product.id}`} className={`${buttonLinkClass.dark} mt-6`}>
          아카이브 상세 보기
        </Link>
      </div>
    );
  }

  const fee = shippingFeeOf(listing);
  const total = listing.price + fee;
  const errors = {
    receiver: receiver.trim() ? null : "받는 분 이름과 연락처를 입력해 주세요.",
    address: address.trim() ? null : "배송지를 입력해 주세요.",
    agreed: agreed ? null : "거래 조건을 확인한 뒤 체크해 주세요.",
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    router.push(`/checkout/${product.id}/done`);
  };

  return (
    <form onSubmit={submit} noValidate className="container-page pb-16 pt-8 md:pb-[130px] md:pt-[56px]">
      <p className="text-[11px] font-bold text-brand">CHECKOUT · DEMO</p>
      <h1 className="mt-5 text-[26px] font-bold leading-[1.3] tracking-[-0.03em] md:mt-7 md:text-[36px]">구매할 상품과 배송 정보를 확인하세요</h1>
      <p className="mt-4 text-[13px] text-sub md:mt-7">실제 결제나 주문은 발생하지 않는 프로토타입입니다.</p>

      <div className="mt-8 grid gap-10 md:mt-6 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-[34px]">
          <section>
            <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[24px]">주문 상품</h2>
            <p className="mt-7 text-[22px] font-bold tracking-[-0.02em]">{product.name}</p>
            <p className="mt-4 text-[14px] leading-[1.75] text-sub">
              {product.color.name} · {listing.size} · 상태 {listing.conditionLabel}
              <br />
              {listing.conditionNote} · 상품 상태 확인 완료 예시
            </p>
          </section>

          <Field label="받는 분" required help="받는 분 정보는 시연용 예시입니다." error={show("receiver")}>
            {(id) => <input id={id} value={receiver} onChange={(e) => setReceiver(e.target.value)} autoComplete="name" className={inputClass} />}
          </Field>

          <Field label="배송지" required help="우편번호 검색 후 상세 주소를 입력합니다." error={show("address")}>
            {(id) => (
              <input
                id={id}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="배송받을 주소를 입력해 주세요."
                autoComplete="street-address"
                className={inputClass}
              />
            )}
          </Field>

          <Field label="배송 요청 (선택)" help="배송 요청사항 입력 예시">
            {(id) => <input id={id} value={request} onChange={(e) => setRequest(e.target.value)} className={inputClass} />}
          </Field>

          <h2 className="mt-2 text-[20px] font-bold tracking-[-0.02em]">결제 수단</h2>
          <Field label="결제 방법" required help={pay === "card" ? "현재 화면은 카드 결제를 선택한 예시입니다." : "현재 화면은 간편결제를 선택한 예시입니다."}>
            {(id) => (
              <Segmented
                id={id}
                label="결제 방법"
                value={pay}
                onChange={setPay}
                options={[
                  { value: "card", label: "카드 결제" },
                  { value: "easy", label: "간편결제" },
                ]}
              />
            )}
          </Field>
        </div>

        {/* 결제 금액 */}
        <aside className="self-start border border-line p-6 md:sticky md:top-24">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[24px]">결제 금액</h2>
          <dl className="mt-7 grid w-fit grid-cols-[auto_auto] gap-x-24 gap-y-1.5 text-[16px] text-sub">
            <dt>상품 금액</dt>
            <dd className="text-right">{won(listing.price)}원</dd>
            <dt>배송비</dt>
            <dd className="text-right">{fee ? `${won(fee)}원` : "없음 (직거래)"}</dd>
          </dl>
          <p className="mt-8 text-[24px] font-bold tracking-[-0.02em] text-brand md:text-[28px]">총 결제 금액 {won(total)}원</p>

          <div className="mt-6">
            <Consent checked={agreed} onChange={setAgreed} error={show("agreed")}>
              상품의 사용 흔적과 거래 조건을 확인했으며, 주문·결제에 동의합니다.
            </Consent>
          </div>

          <button type="submit" className={`${buttonLinkClass.primary} mt-6 w-full !font-medium`}>
            {won(total)}원 결제하기 · 시연
          </button>
          <Link
            href={productHref(product.id, "market")}
            className="mt-6 inline-flex h-[52px] w-full items-center justify-center border border-[#cfcfcf] text-[16px] transition-colors hover:border-ink"
          >
            상품 상세로 돌아가기
          </Link>
          <p className="mt-8 text-[12px] text-faint">가격·배송비·결제 방식은 와이어프레임 시연용 예시입니다.</p>
        </aside>
      </div>
    </form>
  );
}
