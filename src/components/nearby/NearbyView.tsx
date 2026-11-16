"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Navigation } from "lucide-react";
import { cx } from "@/lib/format";
import type { Shop } from "@/types";

/** 가상의 지도 — 실제 지도 SDK(카카오맵 등)로 교체할 자리 */
function DemoMap({ shops, selected, onSelect }: { shops: Shop[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-paper md:aspect-auto md:h-full md:min-h-[520px]">
      <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="100" height="75" fill="#F5F5F5" />
        <path d="M-5,52 C20,44 34,62 58,54 S92,40 106,48 L106,62 C90,56 76,66 58,68 S22,58 -5,66 Z" fill="#E4EAF0" />
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <path d="M-2,22 L102,30" strokeWidth="3" />
          <path d="M-2,40 L102,36" strokeWidth="2.2" />
          <path d="M18,-2 L26,77" strokeWidth="2.2" />
          <path d="M44,-2 L50,77" strokeWidth="3" />
          <path d="M74,-2 L66,77" strokeWidth="2.2" />
          <path d="M-2,10 L60,14 L102,8" strokeWidth="1.4" />
          <path d="M32,-2 L36,50" strokeWidth="1.2" />
          <path d="M86,-2 L88,77" strokeWidth="1.2" />
        </g>
        <g fill="#EAEAEA">
          <rect x="52" y="16" width="10" height="8" />
          <rect x="28" y="26" width="8" height="8" />
          <rect x="76" y="28" width="7" height="6" />
          <rect x="4" y="26" width="9" height="7" />
        </g>
        {/* 현재 위치 */}
        <circle cx="62" cy="40" r="5" fill="#111" opacity="0.08" />
        <circle cx="62" cy="40" r="1.6" fill="#111" stroke="#fff" strokeWidth="0.6" />
      </svg>

      {shops.map((shop, i) => {
        const active = shop.id === selected;
        return (
          <button
            key={shop.id}
            type="button"
            aria-label={`${shop.name} 선택`}
            aria-pressed={active}
            onClick={() => onSelect(shop.id)}
            style={{ left: `${shop.map.x}%`, top: `${shop.map.y}%` }}
            className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          >
            <span
              className={cx(
                "flex items-center justify-center font-extrabold text-white transition-all",
                active ? "h-9 w-9 bg-brand text-[14px]" : "h-7 w-7 bg-ink text-[12px]",
              )}
            >
              {i + 1}
            </span>
            {active && (
              <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 text-[11px] font-bold">
                {shop.name}
              </span>
            )}
          </button>
        );
      })}

      <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-bold tracking-[0.1em]">
        DEMO MAP · 가상 위치
      </span>
      <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-white px-2 py-1 text-[11px] text-sub">
        <Navigation size={11} /> 현재 위치(가상)
      </span>
    </div>
  );
}

export function NearbyView({ shops }: { shops: Shop[] }) {
  const [selected, setSelected] = useState(shops[0].id);

  return (
    <div className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:gap-8">
      <div className="-mx-5 md:mx-0">
        <div className="md:sticky md:top-24">
          <DemoMap shops={shops} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      <ul className="divide-y divide-line border-y border-ink">
        {shops.map((shop, i) => {
          const active = shop.id === selected;
          return (
            <li key={shop.id} className={cx("transition-colors", active && "bg-brand-tint")}>
              <div className="flex gap-3 px-1 py-4 md:px-3">
                <button
                  type="button"
                  aria-label={`${shop.name} 지도에서 보기`}
                  onClick={() => setSelected(shop.id)}
                  className={cx(
                    "flex h-11 w-11 shrink-0 items-center justify-center text-[15px] font-extrabold text-white",
                    active ? "bg-brand" : "bg-ink",
                  )}
                >
                  {i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[17px] font-extrabold tracking-[-0.02em]">{shop.name}</p>
                    {shop.partner && (
                      <span className="border border-brand px-1.5 py-0.5 text-[10px] font-bold text-brand">
                        RE:FOUND 참여 숍
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-sub">
                    <span className="flex items-center gap-1"><MapPin size={12} />{shop.area} · {shop.distanceKm}km</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{shop.hours}</span>
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed">{shop.description}</p>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <ul className="flex flex-wrap gap-1">
                      {shop.tags.map((t) => (
                        <li key={t} className="bg-white px-2 py-1 text-[11px] font-medium ring-1 ring-inset ring-line">{t}</li>
                      ))}
                    </ul>
                    <Link href={`/nearby/${shop.id}`} className="flex h-11 items-center gap-1 text-[13px] font-bold text-brand">
                      매장 보기 <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
