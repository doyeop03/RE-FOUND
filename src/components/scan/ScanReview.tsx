"use client";

import { useEffect, useState } from "react";
import { Check, Info, Sparkles } from "lucide-react";
import { cx } from "@/lib/format";
import type { FlowState, FlowStep } from "@/lib/scan/flow";
import { TARGET_LABEL, type Target } from "@/lib/scan/schemas";
import { getBlob } from "@/lib/scan/session-store";

/**
 * Figma 03 — 사진 등록 완료 · 촬영 결과 확인.
 * 저장된 사진을 부위별 카드로 보여 주고, 필요한 부위만 다시 찍거나 손상 부위를 추가한 뒤 분석을 시작한다.
 */

const DAMAGE_WORDS = /손상|구멍|찢|마모|해짐|얼룩|오염|변색|보풀|올 ?풀|뜯/;

/** 카드 순서 — 앞면 · 태그/케어라벨 · 뒷면 · 추가 부위 */
const BASE_ORDER: Target[] = ["front_full", "care_label", "back_full"];

const BASE_TITLE: Partial<Record<Target, string>> = {
  front_full: "의류 앞면",
  care_label: "태그/케어라벨",
  back_full: "의류 뒷면",
};

/** 디자인에서 필수(*)로 표시하는 부위 */
const STARRED: Target[] = ["front_full", "care_label"];

export const isDamageStep = (s: FlowStep) => s.manual || DAMAGE_WORDS.test(`${s.reason ?? ""} ${s.guide}`);

/** IndexedDB 에 저장된 사진을 blob URL 로 붙인다 */
export function useBlobUrls(ids: string[]) {
  const key = ids.join(",");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    Promise.all(
      key
        .split(",")
        .filter(Boolean)
        .map(async (id) => {
          const blob = await getBlob(id).catch(() => null);
          if (!blob) return null;
          const url = URL.createObjectURL(blob);
          made.push(url);
          return [id, url] as const;
        }),
    ).then((pairs) => {
      if (alive) setUrls(Object.fromEntries(pairs.filter((p): p is readonly [string, string] => !!p)));
    });
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [key]);
  return urls;
}

/** 확인 화면에 올릴 단계 — 기본 3단계는 디자인 순서대로, 추가 부위는 저장된 것만 */
export function reviewSteps(flow: FlowState) {
  const base = BASE_ORDER.map((t) => flow.steps.find((s) => s.kind === "base" && s.target === t)).filter((s): s is FlowStep => !!s);
  const extras = flow.steps.filter((s) => s.kind === "extra" && s.acceptedImageId);
  return { base, extras };
}

function cardText(s: FlowStep) {
  if (s.kind === "extra") {
    return {
      title: isDamageStep(s) ? "손상 부위" : "추가 부위",
      sub: s.manual ? "직접 추가한 부위" : `${TARGET_LABEL[s.target]} · ${s.reason ?? "추가 확인"}`,
    };
  }
  const title = BASE_TITLE[s.target] ?? s.title;
  if (!s.acceptedImageId) return { title, sub: "확인되지 않음 · 다시 촬영할 수 있어요" };
  if (!s.reviewed) return { title, sub: "저장 완료 · AI 검토 없음" };
  return { title, sub: s.target === "care_label" ? "저장 완료 · 글자 확인" : "저장 완료 · 전체 확인" };
}

interface Props {
  flow: FlowState;
  onRetake: (stepId: string) => void;
  onAddDamage: () => void;
  onStart: () => void;
}

export function ScanReview({ flow, onRetake, onAddDamage, onStart }: Props) {
  const { base, extras } = reviewSteps(flow);
  const cards = [...base, ...extras];
  const urls = useBlobUrls(cards.map((s) => s.acceptedImageId ?? "").filter(Boolean));
  const savedBase = base.filter((s) => s.acceptedImageId).length;

  return (
    <section className="animate-page flex flex-col">
      <h1 className="text-[28px] font-bold leading-[1.35] text-[#171717] md:text-[36px]">
        촬영한 사진을
        <br />
        확인해 주세요
      </h1>
      <p className="mt-3 text-[14px] leading-[1.5] text-[#777] md:mt-5 md:text-[15px]">
        기본 사진 {savedBase}장{extras.length > 0 && `과 추가 부위 ${extras.length}장`}이 저장됐어요. 필요한 사진만 다시 촬영할 수 있어요.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:mt-7 md:grid-cols-4">
        {cards.map((s) => {
          const extra = s.kind === "extra";
          const url = s.acceptedImageId ? urls[s.acceptedImageId] : undefined;
          const { title, sub } = cardText(s);
          return (
            <li key={s.id} className="flex min-w-0 flex-col">
              <div
                className={cx(
                  "relative aspect-[272/300] overflow-hidden",
                  extra ? "border border-dashed border-[#bdbdbd] bg-ivory p-1" : "bg-paper",
                )}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 이 기기에 저장된 촬영 사진(blob URL)
                  <img src={url} alt={`${title} 사진`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-faint">
                    {s.acceptedImageId ? "불러오는 중" : "사진 없음"}
                  </span>
                )}
                {!extra && s.acceptedImageId && (
                  <span className="absolute left-2 top-2 flex h-6 items-center gap-1 bg-ink px-2 text-[11px] font-bold text-white">
                    <Check size={12} strokeWidth={3} /> 저장
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRetake(s.id)}
                  className="absolute right-0 top-0 flex h-9 items-center px-2 text-[11px] font-medium text-[#333] drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] hover:text-brand"
                >
                  {s.acceptedImageId ? "재촬영" : "촬영"}
                </button>
              </div>
              <p className="mt-4 text-[15px] font-bold leading-[1.45] text-[#171717]">
                {title}
                {STARRED.includes(s.target) && s.kind === "base" && <span className="ml-1 text-brand">*</span>}
              </p>
              <p className="mt-2 truncate text-[12px] leading-[1.45] text-[#8a8a8a]">{sub}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex gap-2.5 bg-paper p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-brand" />
        <div className="text-[13px] leading-[1.6]">
          <p className="font-bold text-[#171717]">촬영 결과 확인</p>
          <p className="max-w-[40em] text-[#777]">
            감지된 손상과 사진을 확인해 주세요. 빠진 손상은 추가 촬영하고, 흐린 사진은 해당 부위만 다시 찍을 수 있어요.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4 md:gap-4">
        <button
          type="button"
          onClick={onAddDamage}
          className="order-2 h-[52px] border border-[#d6d6d6] bg-white px-6 text-[16px] font-medium text-[#222] transition-colors hover:border-ink md:order-1"
        >
          손상 부위 추가 촬영
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={!base.some((s) => s.target === "front_full" && s.acceptedImageId)}
          className="order-1 inline-flex h-[52px] items-center justify-center gap-2 bg-brand px-6 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark disabled:bg-line disabled:text-faint md:order-2 md:col-span-3"
        >
          <Sparkles size={18} /> 확인하고 분석 시작
        </button>
      </div>
    </section>
  );
}
