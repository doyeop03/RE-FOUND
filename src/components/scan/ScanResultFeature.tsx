"use client";

import Link from "next/link";
import { ArrowRight, Check, Plus, RotateCcw } from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { Button, DemoTag, buttonLinkClass } from "@/components/ui/primitives";
import { cx, priceRange, seasonLabel, shortYear } from "@/lib/format";
import { RARITY_LABEL } from "@/lib/rarity";
import type { Product, ScanResult } from "@/types";

/**
 * 스캔 결과 — 매거진 피처 형식.
 * 내가 찍은 옷 한 벌을 잡지의 한 꼭지처럼 소개한다:
 * 큰 제목 → 큰 사진 → 크레디트 → 번호가 붙은 짧은 글(시대 · 희귀도 · 상태 · 시장 · 스타일링).
 */

interface Props {
  product: Product;
  result: ScanResult;
  /** 사용자가 올린 앞면 사진 (샘플 체험이면 null) */
  photoUrl: string | null;
  saved: boolean;
  onSave: () => void;
  onRestart: () => void;
}

function Note({ no, label, title, children }: { no: string; label: string; title: string; children: React.ReactNode }) {
  return (
    <li className="border-t border-ink pt-4">
      <div className="flex items-baseline gap-3">
        <span className="display text-[30px] text-brand md:text-[36px]">{no}</span>
        <span className="eyebrow !text-[10px] text-sub">{label}</span>
      </div>
      <h3 className="mt-2 text-[22px] font-extrabold leading-tight tracking-[-0.03em] md:text-[26px]">{title}</h3>
      <div className="mt-3 text-[15px] leading-[1.85]">{children}</div>
    </li>
  );
}

export function ScanResultFeature({ product, result, photoUrl, saved, onSave, onRestart }: Props) {
  const { rarity, market, story } = product;
  const [era, , , point, styling] = story.sections;

  const credits = [
    ["출시 연도 · 시즌", seasonLabel(product.season)],
    ["협업 컬렉션", product.collab ? product.collab.note : "해당 없음"],
    ["소재 · 색상", `${product.material} · ${product.color.name}`],
    ["외관 상태", result.condition.label],
    ["희귀도 등급", `${rarity.grade} · ${RARITY_LABEL[rarity.grade]}`],
    ["예상 매물 가격대", priceRange(market)],
  ];

  return (
    <section className="animate-page -mx-5 mt-6 bg-ivory px-5 pb-10 pt-8 md:-mx-8 md:px-10 md:pb-16 md:pt-12">
      {/* 표제 */}
      <header className="border-b-2 border-ink pb-6 md:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow text-brand">Your Archive · 내가 발견한 옷</p>
          <DemoTag>DEMO 결과 · 공식 인증 아님</DemoTag>
        </div>
        <p className="display mt-5 text-[84px] text-brand md:text-[140px]">{shortYear(product.season)}</p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] md:text-[56px]">{product.name}</h1>
        <p className="mt-2 text-[15px] text-sub md:text-[17px]">
          {product.nameKo} · {product.collection}
        </p>
      </header>

      {/* 사진 + 리드 */}
      <div className="mt-6 grid gap-6 md:mt-10 md:grid-cols-[1.15fr_1fr] md:gap-12">
        <figure>
          <div className="relative -mx-5 aspect-[4/5] overflow-hidden bg-white md:mx-0">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 사용자가 방금 고른 로컬 blob 미리보기
              <img src={photoUrl} alt="내가 올린 옷 사진" className="h-full w-full object-cover" />
            ) : (
              <GarmentImage spec={product.garment} label={product.nameKo} className="h-full w-full p-[9%]" />
            )}
            <span className="display absolute left-4 top-3 text-[64px] text-brand md:text-[88px]">{rarity.grade}</span>
            {photoUrl && (
              <span className="absolute bottom-3 right-3 h-[108px] w-[86px] border-2 border-white bg-white">
                <GarmentImage spec={product.garment} className="h-full w-full p-1" label="매칭된 아카이브" />
              </span>
            )}
          </div>
          <figcaption className="mt-2 text-[11px] tracking-[0.04em] text-sub">
            {photoUrl ? "내가 올린 사진 — 오른쪽 아래는 매칭된 아카이브" : "샘플 이미지"} · 아카이브 일치도{" "}
            {Math.round(result.confidence * 100)}% (데모 값)
          </figcaption>
        </figure>

        <div>
          <p className="eyebrow !text-[10px] text-sub">{story.kicker}</p>
          <h2 className="display mt-3 text-[40px] leading-[1.02] md:text-[60px]">{story.headline}</h2>
          <p className="mt-5 text-[17px] font-bold leading-[1.65] tracking-[-0.02em] md:text-[19px]">{product.description}</p>

          {/* 크레디트 */}
          <dl className="mt-6 border-t border-ink">
            {credits.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
                <dt className="shrink-0 text-[12px] text-sub">{k}</dt>
                <dd
                  className={cx(
                    "text-right text-[13px] font-bold",
                    k === "희귀도 등급" && "text-brand",
                    k === "예상 매물 가격대" && !market && "font-medium text-faint",
                  )}
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-faint">
            가격은 중고 매물 호가 범위이며 실거래가가 아닙니다.
            {market ? ` 매물 ${market.listings}건 · ${market.asOf} 기준.` : ""}
          </p>
        </div>
      </div>

      {/* 인용 */}
      <blockquote className="my-10 border-l-[3px] border-brand pl-5 md:my-16 md:pl-8">
        <p className="text-[24px] font-extrabold leading-[1.35] tracking-[-0.03em] md:text-[36px]">“{point.body}”</p>
        <footer className="eyebrow mt-3 !text-[10px] text-sub">{point.label}</footer>
      </blockquote>

      {/* 번호가 붙은 글 */}
      <ol className="grid gap-9 md:grid-cols-2 md:gap-x-12 md:gap-y-12">
        <Note no="01" label="The Era · 이 옷이 나온 시대" title={era.title}>
          <p>{era.body}</p>
        </Note>

        <Note no="02" label="Rarity · 얼마나 드문 옷인가" title={`희귀도 ${rarity.grade} — ${RARITY_LABEL[rarity.grade]}`}>
          <p>
            희소성 지표 합계 <b className="font-extrabold">{rarity.score}</b> / 100. 상태나 인기가 아니라, 얼마나 남아 있는지만으로
            매긴 등급입니다.
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {rarity.factors.map((f) => (
              <li key={f.key} className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5">
                <span className="text-sub">{f.label}</span>
                <span className="text-right font-semibold">{f.value}</span>
              </li>
            ))}
          </ul>
        </Note>

        <Note no="03" label="Condition · 지금 이 옷의 상태" title={`외관 상태 — ${result.condition.label}`}>
          <p>사진에서 확인한 이 옷 한 벌의 상태입니다. 희귀도 등급과는 따로 평가합니다.</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {result.condition.notes.map((n) => (
              <li key={n} className="bg-white px-2.5 py-1.5 text-[12px] font-medium ring-1 ring-inset ring-line">
                {n}
              </li>
            ))}
          </ul>
        </Note>

        <Note no="04" label="How to Wear · 지금 입는다면" title={styling.title}>
          <p>{styling.body}</p>
        </Note>
      </ol>

      {/* 다음 행동 */}
      <div className="mt-10 border-t-2 border-ink pt-6 md:mt-16">
        <p className="eyebrow !text-[10px] text-sub">Next · 이 옷의 다음 이야기</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <Link href={`/archive/${product.id}`} className={`${buttonLinkClass.dark} md:flex-1`}>
            아카이브 자세히 보기 <ArrowRight size={18} />
          </Link>
          {saved ? (
            <Link href="/my" className={`${buttonLinkClass.outline} md:flex-1`}>
              <Check size={18} className="text-brand" /> 옷장에 저장됨 · 보러 가기
            </Link>
          ) : (
            <Button className="md:flex-1" onClick={onSave}>
              <Plus size={18} /> 나의 옷장에 저장
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mx-auto mt-2 flex h-11 items-center gap-1.5 text-[13px] font-semibold text-sub hover:text-ink"
        >
          <RotateCcw size={14} /> 다른 옷 스캔하기
        </button>
      </div>
    </section>
  );
}
