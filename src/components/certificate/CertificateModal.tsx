"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cx } from "@/lib/format";
import type { CertificateData } from "@/types";
import { FlipCertificate } from "./FlipCertificate";

interface Props {
  open: boolean;
  onClose: () => void;
  certificate: CertificateData;
}

const noopSubscribe = () => () => {};

/**
 * 인증서 모달.
 * template.tsx의 페이지 전환 애니메이션(transform)이 fixed 요소의 기준을 바꾸기 때문에
 * document.body로 포털해서 항상 뷰포트 기준으로 띄운다.
 */
export function CertificateModal({ open, onClose, certificate }: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && <CertificateDialog key="certificate" certificate={certificate} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  );
}

/** 열릴 때마다 새로 마운트된다 → isFlipped가 항상 앞면(false)에서 시작한다 */
function CertificateDialog({ certificate, onClose }: { certificate: CertificateData; onClose: () => void }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // 배경 스크롤 잠금 + Esc 닫기 + 포커스 이동/복원
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    cardRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // 포커스 트랩 — 모달 밖으로 Tab이 빠져나가지 않게
      if (e.key === "Tab" && dialogRef.current) {
        const items = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]'),
        ).filter((el) => !el.closest("[inert]"));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${certificate.productName} RE:FOUND 인증서`}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-[calc(56px+env(safe-area-inset-top))]"
    >
      {/* 배경 — 누르면 닫힘 */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      {/* 상단 바 */}
      <motion.div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(8px+env(safe-area-inset-top))] md:px-10 md:pt-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <p className="text-[14px] font-semibold text-white/85 md:text-[17px]">
          RE:FOUND CERTIFICATE
          {certificate.isDemo && <span className="ml-2">/&nbsp; DEMO</span>}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="인증서 닫기"
          className="-mr-2 flex size-11 items-center justify-center text-white hover:text-white/80"
        >
          <X size={28} strokeWidth={1.8} />
        </button>
      </motion.div>

      {/* 인증서 — 바깥 빈 영역 클릭은 배경으로 통과시킨다 */}
      <motion.div
        className="pointer-events-none relative flex flex-col items-center"
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div
          className="pointer-events-auto"
          // 2:3 카드가 화면 높이 안에 반드시 들어오도록 폭을 높이에서 역산한다
          style={{ width: "min(86vw, 540px, calc((100dvh - 168px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * 2 / 3))" }}
        >
          <FlipCertificate
            certificate={certificate}
            isFlipped={isFlipped}
            onFlippedChange={setIsFlipped}
            onNavigate={onClose}
            cardRef={cardRef}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsFlipped((v) => !v)}
          className="pointer-events-auto mt-4 flex h-11 items-center gap-4 px-3 text-[15px] text-white/85 hover:text-white md:text-[18px]"
        >
          카드를 터치하여 뒤집어 보세요
          <span className="flex items-center gap-2" aria-hidden>
            <span className={cx("size-3.5 rounded-full", isFlipped ? "border border-white/80" : "bg-[#d9d9d9]")} />
            <span className={cx("size-3.5 rounded-full", isFlipped ? "bg-[#d9d9d9]" : "border border-white/80")} />
          </span>
        </button>
      </motion.div>
    </div>
  );
}
