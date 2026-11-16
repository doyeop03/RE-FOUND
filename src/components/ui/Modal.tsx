"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}

/** 모바일에서는 하단 시트, 데스크톱에서는 중앙 다이얼로그 */
export function Modal({ open, onClose, title, eyebrow, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
          <motion.button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 cursor-default bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[88dvh] w-full flex-col bg-white md:max-w-[480px]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                {eyebrow && <p className="eyebrow mb-1 text-brand">{eyebrow}</p>}
                <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
