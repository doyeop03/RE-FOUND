import { Check } from "lucide-react";
import { cx } from "@/lib/format";
import { BASIS_LABEL, FACT_STATUS_LABEL } from "@/lib/archive/record-rules";
import type { Fact, FactStatus } from "@/types/archive-record";

/** 값 옆에 붙는 확인 상태 표식 — verified 만 레드 체크, 나머지는 회색 계열 */
export function StatusChip({ status, className }: { status: FactStatus; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 shrink-0 items-center gap-0.5 px-1.5 text-[10px] font-bold",
        status === "verified" && "bg-brand text-white",
        status === "claimed" && "bg-white text-ink ring-1 ring-inset ring-ink",
        status === "observed" && "bg-ink text-white",
        status === "unknown" && "bg-paper text-faint",
        className,
      )}
    >
      {status === "verified" && <Check size={10} strokeWidth={3.5} />}
      {FACT_STATUS_LABEL[status]}
    </span>
  );
}

export function factText<T>(f: Fact<T>, format?: (v: T) => string) {
  if (f.value === null) return null;
  if (format) return format(f.value);
  return Array.isArray(f.value) ? f.value.join(", ") : String(f.value);
}

export function basisText(f: Fact<unknown>) {
  if (f.status === "unknown") return f.note ?? "확인된 자료 없음";
  return [BASIS_LABEL[f.basis], f.note].filter(Boolean).join(" · ");
}
