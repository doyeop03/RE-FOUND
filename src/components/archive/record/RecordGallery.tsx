"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSlot } from "@/components/archive/ImageSlot";
import { ZoomViewer } from "@/components/ui/ZoomViewer";
import { cx } from "@/lib/format";
import type { ArchiveRecord, RecordImage } from "@/types/archive-record";

const ORDER: RecordImage["role"][] = [
  "front",
  "editorial_product",
  "back",
  "angled_front",
  "care_label",
  "collar_label",
  "sleeve",
  "shoulder",
  "collar",
  "zipper",
  "fabric",
  "detail",
  "lookbook",
  "brand_history",
];

/**
 * 실제 레코드 갤러리 — 대표 이미지는 앞면(실제 촬영 사진이 있으면 그 사진).
 * 권한 미확인 이미지는 ImageSlot 이 출처 링크 + 등록 영역으로 바꿔 그린다.
 */
export function RecordGallery({ record }: { record: ArchiveRecord }) {
  // 브랜드 일반 자료(이 제품이 아닌 사진)는 제품 갤러리에 넣지 않는다 — 에디토리얼 THEN & NOW 에서만 보여 준다
  const images = record.images
    .filter((i) => i.relation !== "brand_archive")
    .sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(null);
  const close = useCallback(() => setZoom(null), []);
  const open = useCallback((src: string, caption: string) => setZoom({ src, caption }), []);

  if (images.length === 0) {
    return (
      <ImageSlot image={null} registerKey={`${record.id}:gallery-front`} label="Front" emptyNote="등록된 제품 사진이 없습니다." className="aspect-square md:aspect-[4/5]" />
    );
  }

  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  const current = images[index];
  const source = current.sourceId ? record.sources.find((s) => s.id === current.sourceId) ?? null : null;

  return (
    <div>
      <div
        className="relative"
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        <ImageSlot
          key={current.id}
          image={current}
          source={source}
          registerKey={`${record.id}:gallery-${current.id}`}
          label={current.label}
          onOpen={open}
          className="aspect-square animate-page md:aspect-[4/5]"
        />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="이전 이미지" onClick={() => go(-1)} className="absolute left-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center">
              <ChevronLeft size={26} strokeWidth={1.6} />
            </button>
            <button type="button" aria-label="다음 이미지" onClick={() => go(1)} className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center">
              <ChevronRight size={26} strokeWidth={1.6} />
            </button>
          </>
        )}
        <span className="pointer-events-none absolute bottom-3 left-3 bg-white px-2 py-1 text-[11px] font-bold">
          {index + 1} / {images.length} · {current.label}
        </span>
        <span className="pointer-events-none absolute bottom-3 right-3 bg-white/90 px-2 py-1 text-[10px] text-sub">
          {current.rights === "own_capture" ? "내가 촬영한 사진" : current.sourceLabel}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 px-5 md:px-0">
        {images.slice(0, 8).map((im, i) => (
          <button
            key={im.id}
            type="button"
            aria-label={`${im.label} 보기`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={cx(
              "relative aspect-square overflow-hidden bg-paper outline-offset-[-2px]",
              i === index ? "outline outline-2 outline-ink" : "opacity-70 hover:opacity-100",
            )}
          >
            {im.src ? (
              // eslint-disable-next-line @next/next/no-img-element -- 권한 확인 / 직접 촬영 이미지
              <img src={im.src} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center bg-ivory px-1 text-center">
                <span className="text-[11px] font-extrabold leading-tight">{im.label}</span>
                <span className="mt-0.5 text-[9px] text-faint">{im.rights === "unverified" ? "권한 미확인" : "없음"}</span>
              </span>
            )}
          </button>
        ))}
      </div>
      <ZoomViewer src={zoom?.src ?? null} alt={current.label} caption={zoom?.caption} onClose={close} />
    </div>
  );
}
