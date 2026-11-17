import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/format";
import { CHECK_GUIDE, VERIFICATION_STATUS } from "@/lib/verification";
import type { Verification } from "@/types";

type StepState = "done" | "current" | "blocked" | "todo";

/** 상세 페이지에서 인증 카드 옆에 놓는 검증 절차 · 기준 안내 */
export function VerificationProcess({ verification: v }: { verification: Verification }) {
  const steps: { label: string; en: string; date: string; state: StepState }[] = [
    { label: "검증 접수", en: "Requested", date: v.requestedAt, state: "done" },
    {
      label: "항목별 검수",
      en: "Inspection",
      date: v.status === "verified" ? "완료" : v.status === "in_review" ? "진행 중" : "자료 대기",
      state: v.status === "verified" ? "done" : v.status === "in_review" ? "current" : "blocked",
    },
    {
      label: "인증서 발급",
      en: "Issued",
      date: v.verifiedAt ?? (v.expectedAt ? `${v.expectedAt} 예정` : "-"),
      state: v.status === "verified" ? "done" : "todo",
    },
  ];

  return (
    <div className="min-w-0">
      <p className="eyebrow text-sub">Status</p>
      <p className="mt-2 text-[24px] font-extrabold tracking-[-0.03em] md:text-[28px]">
        {VERIFICATION_STATUS[v.status].label}
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-sub">{VERIFICATION_STATUS[v.status].desc}</p>

      {/* 절차 */}
      <ol className="mt-6 grid grid-cols-3 border-t-2 border-ink">
        {steps.map((s, i) => (
          <li key={s.en} className="relative pr-2 pt-4">
            <span
              className={cx(
                "absolute -top-[7px] left-0 size-3 rounded-full border-2",
                s.state === "done" && "border-ink bg-ink",
                s.state === "current" && "border-ink bg-white",
                s.state === "blocked" && "border-brand bg-brand",
                s.state === "todo" && "border-line bg-white",
              )}
            />
            <p className="text-[11px] font-semibold text-faint">0{i + 1} · {s.en}</p>
            <p className={cx("mt-1 text-[14px] font-bold", s.state === "todo" && "text-faint")}>{s.label}</p>
            <p className={cx("mt-0.5 text-[12px]", s.state === "blocked" ? "font-semibold text-brand" : "text-sub")}>
              {s.date}
            </p>
          </li>
        ))}
      </ol>

      {/* 기준 안내 */}
      <h3 className="mt-10 text-[17px] font-extrabold">RE:FOUND 검증 기준</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-sub">
        모든 아카이브는 아래 다섯 가지 기준으로 확인합니다. 하나라도 판단이 어려우면 &lsquo;추가 확인 필요&rsquo;로 분류하고 자료를 요청합니다.
      </p>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        {v.checks.map((c, i) => (
          <div key={c.key} className="grid grid-cols-[28px_1fr] gap-x-2 py-3.5">
            <span className="display text-[17px] text-brand">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <dt className="text-[14px] font-bold">{c.label}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-sub">{CHECK_GUIDE[c.key]}</dd>
            </div>
          </div>
        ))}
      </dl>

      {v.status === "needs_review" && (
        <Link
          href="/scan"
          className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 bg-brand px-5 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark sm:w-auto"
        >
          추가 사진 제출하기
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
