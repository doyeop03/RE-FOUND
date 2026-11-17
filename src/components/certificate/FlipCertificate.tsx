"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { cx } from "@/lib/format";
import type { CertificateData } from "@/types";
import { CERT_EM, CertificateBack, CertificateFront } from "./CertificateFaces";

/** 카드 두께(px). 앞 · 뒷면을 ±절반씩 띄우고 좌우에 옆면을 세워 종이 카드의 두께를 만든다 */
const DEPTH = 4;
const FLIP_DURATION = 0.72;

interface Props {
  certificate: CertificateData;
  /** 제어 모드 — 넘기면 부모가 앞/뒷면을 관리한다 */
  isFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
  /** 뒷면 "아카이브 상세보기"를 눌렀을 때 (모달 닫기 등) */
  onNavigate?: () => void;
  /** 키보드 포커스를 받을 카드 요소 */
  cardRef?: React.Ref<HTMLDivElement>;
  className?: string;
}

function Face({
  side,
  hidden,
  children,
}: {
  side: "front" | "back";
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={hidden}
      inert={hidden}
      // filter(drop-shadow)는 Safari에서 3D를 평면화할 수 있어 면마다 box-shadow를 쓴다
      className="absolute inset-0 overflow-hidden rounded-[1.6em] shadow-[0_2.4em_4.4em_-1.2em_rgba(0,0,0,0.6)]"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        // 뒷면은 미리 180도 돌려 두어야 카드가 뒤집혔을 때 글자가 바로 읽힌다
        transform: side === "back" ? `rotateY(180deg) translateZ(${DEPTH / 2}px)` : `translateZ(${DEPTH / 2}px)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 앞뒤로 뒤집히는 3D 인증서.
 * 클릭 · 터치 · Enter/Space로 Y축 180도 회전한다. 크기는 부모 폭을 따르고 비율은 2:3으로 고정.
 */
export function FlipCertificate({
  certificate,
  isFlipped,
  onFlippedChange,
  onNavigate,
  cardRef,
  className,
}: Props) {
  const [innerFlipped, setInnerFlipped] = useState(false);
  const flipped = isFlipped ?? innerFlipped;
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const prevFlipped = useRef(flipped);

  const toggle = () => {
    const next = !flipped;
    if (isFlipped === undefined) setInnerFlipped(next);
    onFlippedChange?.(next);
  };

  // 뒤집힐 때 카드를 살짝 들어 올렸다 내려놓는다 (손으로 뒤집는 느낌)
  useEffect(() => {
    if (prevFlipped.current === flipped) return;
    prevFlipped.current = flipped;
    if (reduceMotion || !scope.current) return;
    animate(
      scope.current,
      { scale: [1, 1.05, 1], y: [0, -10, 0] },
      { duration: FLIP_DURATION, ease: "easeInOut" },
    );
  }, [flipped, reduceMotion, animate, scope]);

  return (
    <div ref={scope} className={cx("@container relative aspect-[2/3] w-full", className)}>
      <div className="h-full w-full" style={{ perspective: "1600px" }}>
        <motion.div
          ref={cardRef}
          role="group"
          tabIndex={0}
          aria-roledescription="뒤집을 수 있는 인증서"
          aria-label={`RE:FOUND 인증서 ${flipped ? "뒷면 · 검증 정보" : "앞면"}. Enter 또는 Space 키로 뒤집기`}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : FLIP_DURATION, ease: [0.45, 0.05, 0.2, 1] }}
          className="relative h-full w-full cursor-pointer select-none rounded-[1.6em] focus-visible:outline-offset-4"
          style={{
            fontSize: CERT_EM,
            transformStyle: "preserve-3d",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <Face side="front" hidden={flipped}>
            <CertificateFront certificate={certificate} />
          </Face>
          <Face side="back" hidden={!flipped}>
            <CertificateBack certificate={certificate} onNavigate={onNavigate} />
          </Face>

          {/* 옆면 (두께) — 카드가 90도 근처일 때만 보인다 */}
          {(["left", "right"] as const).map((s) => (
            <span
              key={s}
              aria-hidden
              className="absolute bg-[#d8d4cc]"
              style={{
                top: "1.6em",
                bottom: "1.6em",
                width: DEPTH,
                [s]: -DEPTH / 2,
                transform: `rotateY(${s === "left" ? -90 : 90}deg)`,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
