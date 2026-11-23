"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";

const noop = () => () => {};

/**
 * 사진 확대 보기 — 두 손가락 핀치, 더블탭, +/- 버튼으로 1–4배 확대하고 드래그로 이동한다.
 * 상세 페이지의 DESIGN IN DETAIL 과 스캔 화면의 촬영 확인에서 함께 쓴다.
 */
export function ZoomViewer({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string | null;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted || !src) return null;
  return createPortal(<Viewer key={src} src={src} alt={alt} caption={caption} onClose={onClose} />, document.body);
}

function Viewer({ src, alt, caption, onClose }: { src: string; alt: string; caption?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const clamp = (s: number) => Math.min(4, Math.max(1, s));
  const zoom = (s: number) => {
    const next = clamp(s);
    setScale(next);
    if (next === 1) setPos({ x: 0, y: 0 });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${alt} 확대 보기`} className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-[calc(8px+env(safe-area-inset-top))] text-white">
        <p className="text-[12px] font-semibold tracking-[0.12em] text-white/70">{Math.round(scale * 100)}%</p>
        <button type="button" onClick={onClose} aria-label="확대 보기 닫기" className="-mr-2 flex size-11 items-center justify-center">
          <X size={24} />
        </button>
      </div>
      <div
        className="relative flex-1 touch-none overflow-hidden"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          setDragging(true);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
          }
          const now = Date.now();
          if (pointers.current.size === 1 && now - lastTap.current < 280) zoom(scale > 1 ? 1 : 2.5);
          lastTap.current = now;
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            const [a, b] = [...pointers.current.values()];
            zoom((pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
          } else if (scale > 1) {
            setPos((p) => ({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          if (pointers.current.size === 0) setDragging(false);
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size === 0) setDragging(false);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 사용자 촬영 blob · 권한 확인된 이미지만 전달된다 */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: dragging ? "none" : "transform .15s" }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 text-white">
        <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/75">{caption}</p>
        <div className="flex shrink-0 gap-1">
          <button type="button" aria-label="축소" onClick={() => zoom(scale - 0.5)} className="flex size-11 items-center justify-center border border-white/30">
            <Minus size={18} />
          </button>
          <button type="button" aria-label="확대" onClick={() => zoom(scale + 0.5)} className="flex size-11 items-center justify-center border border-white/30">
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
