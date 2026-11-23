"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { cx } from "@/lib/format";
import type { Candidate } from "@/lib/scan/match";

/**
 * 제품 후보 확인 — 품번이 일치해도 자동 확정하지 않고 사용자가 고른다.
 * '해당 제품 없음'을 고르면 제품 미확인으로 저장된다.
 */
export function CandidatePicker({
  candidates,
  recognizedCode,
  onChoose,
}: {
  candidates: Candidate[];
  recognizedCode: string | null;
  onChoose: (c: Candidate | null) => void;
}) {
  return (
    <section className="animate-page pt-8">
      <p className="eyebrow text-brand">Step 5 · 제품 확인</p>
      <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.035em]">이 옷과 같은 제품을 골라 주세요</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-sub">
        {recognizedCode ? (
          <>
            케어라벨에서 품번 <b className="text-ink">{recognizedCode}</b>을(를) 읽었습니다.{" "}
          </>
        ) : (
          "케어라벨 품번을 읽지 못해 유형 · 색상으로 찾은 후보입니다. "
        )}
        확실하지 않으면 &lsquo;해당 제품 없음&rsquo;을 골라 주세요. 출시 정보는 고른 제품의 출처 자료로만 표시합니다.
      </p>

      <ul className="mt-6 space-y-3">
        {candidates.map((c) => {
          const p = c.product;
          const official = p.product_sources.find((s) => s.scope === "product") ?? p.product_sources[0];
          return (
            <li key={p.id} className="border border-ink">
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className={cx("inline-flex h-6 items-center px-2 text-[11px] font-bold", c.method === "product_code" ? "bg-brand text-white" : "border border-ink")}>
                    {c.method === "product_code" ? "품번 정확히 일치" : "유형 · 색상 후보"}
                  </span>
                  {c.similarity && (
                    <span className="inline-flex h-6 items-center bg-ink px-2 text-[11px] font-bold text-white">
                      기준 사진 비교: {c.similarity.same_model === "likely" ? "비슷함" : c.similarity.same_model === "unlikely" ? "다름" : "판단 어려움"}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[18px] font-extrabold leading-snug">{p.name}</p>
                {p.name_ko && <p className="text-[13px] text-sub">{p.name_ko}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                  {[
                    ["출시", p.release_year ? `${p.release_year}${p.release_season ? ` ${p.release_season}` : ""}` : "정보 없음"],
                    ["컬렉션", p.collection ?? "정보 없음"],
                    ["색상", p.color ?? "정보 없음"],
                    ["소재", p.material ?? "정보 없음"],
                    ["품번", p.product_code ?? "정보 없음"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="w-10 shrink-0 text-sub">{k}</dt>
                      <dd className={cx("font-bold", v === "정보 없음" && "font-medium text-faint")}>{v}</dd>
                    </div>
                  ))}
                </dl>
                {p.description && <p className="mt-3 text-[13px] leading-relaxed">{p.description}</p>}
                {c.crossChecks.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    {c.crossChecks.map((x) => (
                      <li key={x.field} className={cx("px-2 py-1 font-bold", x.result === "match" ? "bg-paper" : x.result === "mismatch" ? "bg-brand-tint text-brand" : "bg-paper text-faint")}>
                        {x.field} {x.result === "match" ? "일치" : x.result === "mismatch" ? "다름" : "판단 불가"}
                      </li>
                    ))}
                  </ul>
                )}
                {c.similarity && c.similarity.differences_ko.length > 0 && (
                  <p className="mt-2 text-[12px] text-sub">차이: {c.similarity.differences_ko.join(", ")}</p>
                )}
                {official && (
                  <a href={official.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1 text-[12px] font-bold underline-offset-4 hover:underline">
                    공식 정보 출처 · {official.publisher} <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
              <button type="button" onClick={() => onChoose(c)} className="flex h-[52px] w-full items-center justify-center gap-2 border-t border-ink bg-ink text-[15px] font-bold text-white hover:bg-black">
                <Check size={18} /> 이 제품이 맞아요
              </button>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={() => onChoose(null)} className="mt-4 h-[52px] w-full border border-ink text-[15px] font-bold">
        해당 제품 없음 · 제품 미확인으로 저장
      </button>
    </section>
  );
}
