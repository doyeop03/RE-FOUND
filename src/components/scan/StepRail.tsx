import { Check, Minus } from "lucide-react";
import { cx } from "@/lib/format";
import type { FlowStep } from "@/lib/scan/flow";

/** 검수 서비스처럼 단계별 진행 상황을 보여 주는 레일 */
export function StepRail({ steps, currentId, finalActive }: { steps: FlowStep[]; currentId: string | null; finalActive: boolean }) {
  const items = [
    ...steps.map((s) => ({ id: s.id, label: s.kind === "extra" ? s.title.replace(" 추가 촬영", "") : s.title, status: s.status, extra: s.kind === "extra" })),
    { id: "final", label: "최종 분석", status: "pending" as const, extra: false },
  ];
  return (
    <ol className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:px-0" aria-label="촬영 단계">
      {items.map((it, i) => {
        const active = it.id === currentId || (it.id === "final" && finalActive);
        const done = it.status === "accepted";
        const skipped = it.status === "unverified";
        return (
          <li key={it.id} className="min-w-[84px] flex-1" aria-current={active ? "step" : undefined}>
            <div className={cx("h-[3px]", done ? "bg-ink" : active ? "bg-brand" : skipped ? "bg-faint" : "bg-line")} />
            <p className={cx("mt-2 flex items-center gap-1 text-[11px] font-bold", active ? "text-ink" : done ? "text-ink" : "text-faint")}>
              <span className={cx("flex size-4 items-center justify-center text-[10px]", done ? "bg-ink text-white" : active ? "bg-brand text-white" : skipped ? "bg-paper text-sub" : "border border-line")}>
                {done ? <Check size={10} strokeWidth={3.5} /> : skipped ? <Minus size={10} /> : i + 1}
              </span>
              <span className="truncate">{it.label}</span>
            </p>
            {it.extra && <p className="mt-0.5 text-[10px] font-semibold text-brand">AI 요청</p>}
            {skipped && <p className="mt-0.5 text-[10px] text-faint">확인되지 않음</p>}
          </li>
        );
      })}
    </ol>
  );
}
