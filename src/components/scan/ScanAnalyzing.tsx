"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cx } from "@/lib/format";

/**
 * Figma 04 — 분석 중.
 * 실제 분석 단계(progress 0~3)를 디자인의 항목 목록과 퍼센트로 보여 준다.
 *  0 사진 종합 분석 → 1 아카이브 큐레이션 작성(프로토타입: AI가 상품 DB 역할) → 2 결과 정리 → 3 상세 페이지 구성
 */

const ROWS: { label: string; doneAt: number }[] = [
  { label: "의류 이미지 분석", doneAt: 1 },
  { label: "케어라벨 확인", doneAt: 1 },
  { label: "시대성·브랜드 아카이브 비교", doneAt: 2 },
  { label: "외관 상태 확인", doneAt: 3 },
  { label: "수요성·서사성·대표성 기록 비교", doneAt: 3 },
  { label: "다섯 가지 가치 비교", doneAt: 4 },
];

/** 단계마다 퍼센트가 향해 가는 값 — 실제 완료 전에는 100%를 넘지 않는다 */
const TARGET = [34, 56, 78, 94];

interface Props {
  photoUrl: string | null;
  progress: number;
  error: { message: string; detail?: string; retry: () => void } | null;
  onCancel: () => void;
}

export function ScanAnalyzing({ photoUrl, progress, error, onCancel }: Props) {
  const [pct, setPct] = useState(0);
  const target = TARGET[Math.min(progress, TARGET.length - 1)];
  const floor = progress > 0 ? TARGET[progress - 1] : 0;

  useEffect(() => {
    if (error) return;
    const t = window.setInterval(() => {
      setPct((p) => {
        const from = Math.max(p, floor);
        return from >= target ? from : Math.min(target, from + Math.max(0.25, (target - from) * 0.05));
      });
    }, 120);
    return () => window.clearInterval(t);
  }, [target, floor, error]);

  const shown = Math.round(Math.max(pct, floor));
  const activeIdx = error ? -1 : ROWS.findIndex((r) => progress < r.doneAt);

  return (
    <section className="animate-page grid justify-center gap-8 md:grid-cols-[minmax(0,380px)_minmax(0,444px)] md:gap-20" aria-live="polite">
      {/* 분석 중인 사진 */}
      <div className="relative mx-auto aspect-[380/475] w-full max-w-[380px] overflow-hidden bg-paper">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 이 기기에 저장된 촬영 사진(blob URL)
          <img src={photoUrl} alt="분석 중인 앞면 사진" className="h-full w-full object-cover" />
        )}
        {(["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"] as const).map((c) => (
          <span key={c} aria-hidden className={cx("absolute size-6 border-white", c)} />
        ))}
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-ink px-2 py-1 text-[12px] font-bold text-white">DEMO SCAN</span>
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="flex items-baseline gap-3 leading-none">
          <span className="text-[72px] font-bold tracking-[-0.04em] text-ink md:text-[96px]">{error ? "—" : shown}</span>
          <span className="text-[28px] font-bold text-brand">%</span>
        </p>
        <div className="mt-2 h-1 bg-[#e5e5e5]" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100} aria-label="분석 진행률">
          <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${shown}%` }} />
        </div>

        <h1 className="mt-6 border-b border-line pb-3 text-[20px] font-bold leading-[1.45] text-[#171717]">
          {error ? "분석을 마치지 못했어요" : "올드 유니클로 빈티지 유형 분석 중"}
        </h1>
        <ul>
          {ROWS.map((r, i) => {
            const done = progress >= r.doneAt;
            const active = i === activeIdx;
            return (
              <li key={r.label} className="flex h-12 items-center gap-3 border-b border-line text-[14px]">
                {done ? (
                  <span className="flex size-6 shrink-0 items-center justify-center bg-brand text-white">
                    <Check size={15} strokeWidth={3} />
                  </span>
                ) : active ? (
                  <span className="flex size-6 shrink-0 items-center justify-center">
                    <span className="size-[18px] animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  </span>
                ) : (
                  <span className="size-6 shrink-0 border border-line" />
                )}
                <span className={cx("flex-1", active ? "font-bold text-ink" : done ? "text-ink" : "text-faint")}>
                  {r.label}
                  {active && " 중"}
                </span>
                {done && <span className="text-[12px] text-[#999]">완료</span>}
              </li>
            );
          })}
        </ul>

        {error ? (
          <div className="mt-4 border border-brand p-4" role="alert">
            <p className="text-[13px] leading-relaxed">{error.message}</p>
            {error.detail && <p className="mt-1 break-all text-[11px] leading-relaxed text-faint">원인: {error.detail}</p>}
            <button type="button" onClick={error.retry} className="mt-3 inline-flex h-11 items-center gap-1.5 bg-brand px-4 text-[14px] font-bold text-white hover:bg-brand-dark">
              <RotateCcw size={15} /> 다시 시도
            </button>
          </div>
        ) : (
          <p className="mt-6 text-[12px] leading-[1.45] text-[#777]">사진 수에 따라 30초에서 1분 정도 걸려요. 분석이 끝나면 결과 화면으로 이동해요.</p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 h-11 self-start border border-ink bg-white px-5 text-[15px] font-bold text-ink transition-colors hover:bg-paper"
        >
          취소
        </button>
      </div>
    </section>
  );
}
