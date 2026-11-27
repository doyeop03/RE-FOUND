"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { cx } from "@/lib/format";
import type { GarmentView, Product } from "@/types";

const VIEWS: { view: GarmentView; label: string }[] = [
  { view: "front", label: "앞면" },
  { view: "back", label: "뒷면" },
  { view: "label", label: "라벨" },
  { view: "detail", label: "소재" },
];

/** thumbnails — 아래에 부위별 썸네일 줄 (Figma 09 구매 상세) */
export function Gallery({ product, thumbnails = false }: { product: Product; thumbnails?: boolean }) {
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = (delta: number) => setIndex((i) => (i + delta + VIEWS.length) % VIEWS.length);
  const current = VIEWS[index];
  const flat = current.view === "label" || current.view === "detail";

  return (
    <div>
      <div
        className="relative aspect-[4/5] overflow-hidden bg-paper"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        <GarmentImage
          key={current.view}
          spec={product.garment}
          view={current.view}
          label={`${product.nameKo} ${current.label}`}
          className={cx("h-full w-full animate-page", !flat && "p-[7%]")}
        />
        <button type="button" aria-label="이전 이미지" onClick={() => go(-1)} className="absolute left-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center">
          <ChevronLeft size={26} strokeWidth={1.6} className={flat ? "text-white" : undefined} />
        </button>
        <button type="button" aria-label="다음 이미지" onClick={() => go(1)} className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center">
          <ChevronRight size={26} strokeWidth={1.6} className={flat ? "text-white" : undefined} />
        </button>
        <span className="absolute bottom-3 left-3 bg-white px-2 py-1 text-[11px] font-bold">
          {index + 1} / {VIEWS.length} · {current.label}
        </span>
        <span className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 text-[10px] text-sub">
          일러스트 플레이스홀더
        </span>
      </div>
      {thumbnails && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {VIEWS.map((v, i) => (
            <button
              key={v.view}
              type="button"
              aria-label={`${v.label} 보기`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cx("aspect-square overflow-hidden bg-paper outline-offset-[-2px]", i === index ? "outline outline-2 outline-ink" : "hover:opacity-85")}
            >
              <GarmentImage
                spec={product.garment}
                view={v.view}
                label={v.label}
                className={cx("h-full w-full", v.view === "front" || v.view === "back" ? "p-2" : "")}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
