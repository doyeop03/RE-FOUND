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

/** 실제 촬영 사진 (blob URL) — 주어지면 이 사진들만 보여 주고 일러스트는 쓰지 않는다 */
export interface GalleryPhoto {
  label: string;
  src: string;
}

type Slide = { key: string; label: string; src: string | null; view: GarmentView };

/** thumbnails — 아래에 부위별 썸네일 줄 (Figma 09 구매 상세) */
export function Gallery({ product, thumbnails = false, photos }: { product: Product; thumbnails?: boolean; photos?: GalleryPhoto[] }) {
  const slides: Slide[] = photos?.length
    ? photos.map((p, i) => ({ key: `photo-${i}`, label: p.label, src: p.src, view: "front" }))
    : VIEWS.map((v) => ({ key: v.view, label: v.label, src: null, view: v.view }));
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);
  const current = slides[Math.min(index, slides.length - 1)];
  const flat = Boolean(current.src) || current.view === "label" || current.view === "detail";

  const render = (s: Slide, className: string, alt: string) =>
    s.src ? (
      // eslint-disable-next-line @next/next/no-img-element -- 이 기기에 저장된 촬영 사진(blob URL)
      <img src={s.src} alt={alt} className={cx("h-full w-full object-cover", className)} />
    ) : (
      <GarmentImage spec={product.garment} view={s.view} label={alt} className={cx("h-full w-full", className)} />
    );

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
        <div key={current.key} className="h-full w-full animate-page">
          {render(current, !flat ? "p-[7%]" : "", `${product.nameKo} ${current.label}`)}
        </div>
        {slides.length > 1 && (
          <>
            <button type="button" aria-label="이전 이미지" onClick={() => go(-1)} className="absolute left-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center">
              <ChevronLeft size={26} strokeWidth={1.6} className={flat ? "text-white drop-shadow" : undefined} />
            </button>
            <button type="button" aria-label="다음 이미지" onClick={() => go(1)} className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center">
              <ChevronRight size={26} strokeWidth={1.6} className={flat ? "text-white drop-shadow" : undefined} />
            </button>
          </>
        )}
        <span className="absolute bottom-3 left-3 bg-white px-2 py-1 text-[11px] font-bold">
          {index + 1} / {slides.length} · {current.label}
        </span>
        <span className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 text-[10px] text-sub">
          {current.src ? "내가 촬영" : "일러스트 플레이스홀더"}
        </span>
      </div>
      {thumbnails && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`${s.label} 보기`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cx("aspect-square overflow-hidden bg-paper outline-offset-[-2px]", i === index ? "outline outline-2 outline-ink" : "hover:opacity-85")}
            >
              {render(s, !s.src && (s.view === "front" || s.view === "back") ? "p-2" : "", s.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
