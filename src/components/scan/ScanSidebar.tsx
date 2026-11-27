import { cx } from "@/lib/format";
import type { FlowStep } from "@/lib/scan/flow";

/** 기본 촬영 단계 이름 (사이드바 카드) */
export const BASE_SHORT: Record<string, string> = { front_full: "앞면", back_full: "뒷면", care_label: "케어라벨" };

const PROGRESS_ITEMS = ["사진 등록", "분석", "결과"];

/**
 * 전체 과정 — 1. 사진 등록 · 2. 분석 · 3. 결과
 * - capture: 02 자동 스캔 (현재 단계 레드 글자)
 * - numbered: 03 확인 · 04 분석 (레드 번호 + 굵은 글자, 지난 단계 막대는 회색)
 * - result: 05 결과 상세 (글자는 모두 검정, 현재 단계 막대만 레드)
 */
export function ScanProgress({ active, variant = "capture", className }: { active: 0 | 1 | 2; variant?: "capture" | "numbered" | "result"; className?: string }) {
  return (
    <ol className={cx("grid grid-cols-3", variant === "capture" ? "gap-3" : "gap-1.5 md:gap-3", className)} aria-label="스캔 단계">
      {PROGRESS_ITEMS.map((label, i) => {
        const current = i === active;
        const passed = i < active;
        const bar =
          variant === "capture" ? (current ? "bg-brand" : passed ? "bg-ink" : "bg-[#e5e5e5]") : current ? "bg-brand" : "bg-[#dedede]";
        return (
          <li key={label} className={cx("flex flex-col", variant === "numbered" ? "gap-3.5" : "gap-2")} aria-current={current ? "step" : undefined}>
            <span className={cx("h-[3px]", bar)} />
            {variant === "numbered" ? (
              <span className={cx("text-[12px] leading-[1.45]", current || passed ? "font-bold text-ink" : "text-[#999]")}>
                <span className="mr-1 font-bold text-brand">{i + 1}</span>
                {label}
              </span>
            ) : (
              <span
                className={cx(
                  variant === "result" ? "text-[13px] text-ink" : "text-[12px]",
                  variant === "capture" && (current ? "text-brand" : passed ? "text-ink" : "text-[#999]"),
                )}
              >
                {i + 1}. {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** 오른쪽 '촬영 진행' 카드 — 기본 단계(앞면 · 뒷면 · 케어라벨)만 보여 주고 추가 부위는 따로 적는다 */
export function StepCards({ steps, focusId, retakeId }: { steps: FlowStep[]; focusId: string | null; retakeId: string | null }) {
  const base = steps.filter((s) => s.kind === "base");
  const focusStep = steps.find((s) => s.id === focusId);
  // 추가 부위를 찍는 중이면, 그 부위를 요청한 기본 단계를 강조한다
  const focusBaseId = focusStep?.kind === "extra" ? steps.find((s) => focusStep.requestedBy && s.imageIds.includes(focusStep.requestedBy))?.id ?? null : focusId;
  return (
    <ol className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-4">
      {base.map((s, i) => {
        const focus = s.id === focusBaseId;
        const done = s.status === "accepted";
        const skipped = s.status === "unverified";
        const status = s.id === retakeId ? "재촬영 필요" : done ? "저장 완료" : skipped ? "확인되지 않음" : focus ? "자동 확인 중" : "촬영 대기";
        return (
          <li
            key={s.id}
            aria-current={focus ? "step" : undefined}
            className={cx(
              "flex flex-col gap-1 rounded-[8px] border border-[#e2e2e2] p-3 leading-[1.45] md:h-[100px] md:flex-row md:items-center md:gap-2.5 md:p-4",
              focus ? "bg-[#fff7f7]" : "bg-white",
            )}
          >
            <span className="text-[13px] font-bold text-brand md:text-[14px]">{done && !focus ? "완료" : skipped ? "–" : String(i + 1).padStart(2, "0")}</span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className="truncate text-[14px] font-bold text-[#171717] md:text-[16px]">{BASE_SHORT[s.target] ?? s.title}</span>
              <span className="truncate text-[11px] text-[#858585] md:text-[12px]">{status}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
