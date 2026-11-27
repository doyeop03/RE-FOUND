"use client";

import { useId } from "react";
import { cx } from "@/lib/format";

/*
 * 판매 정보 작성 · 주문 결제 화면(Figma 10 · 12)의 입력 부품.
 * 라벨(굵게, 필수는 *) → 60px 입력칸 → 회색 안내문 순서다.
 */

export const inputClass =
  "h-[60px] w-full border border-[#cfcfcf] bg-white px-4 text-[16px] text-ink outline-none transition-colors placeholder:text-[#555] focus:border-ink";

export function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string | null;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-bold text-ink">
        {label}
        {required && " *"}
      </label>
      <div className="mt-3">{children(id)}</div>
      {error ? (
        <p className="mt-2.5 text-[12px] font-medium text-brand" role="alert">
          {error}
        </p>
      ) : (
        help && <p className="mt-2.5 text-[12px] leading-relaxed text-faint">{help}</p>
      )}
    </div>
  );
}

/** 두 가지 중 하나를 고르는 칸 — "택배 배송 / 직거래" 처럼 한 칸 안에 나란히 보인다 */
export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
}: {
  id?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div id={id} role="radiogroup" aria-label={label} className="flex h-[60px] items-center border border-[#cfcfcf] bg-white px-2 text-[16px]">
      {options.map((o, i) => (
        <span key={o.value} className="flex items-center">
          {i > 0 && <span className="px-1 text-ink" aria-hidden>/</span>}
          <button
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx("h-11 px-2", value === o.value ? "font-medium text-ink" : "text-[#aaa] hover:text-sub")}
          >
            {o.label}
          </button>
        </span>
      ))}
    </div>
  );
}

/** 확인 · 동의 체크 */
export function Consent({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-sub">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-[3px] size-4 shrink-0 accent-[#111111]" />
        <span>{children}</span>
      </label>
      {error && (
        <p className="mt-1.5 text-[12px] font-medium text-brand" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
