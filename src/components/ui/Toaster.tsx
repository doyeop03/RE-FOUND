"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { dismissToast, useToasts } from "@/store/toast-store";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto flex min-h-12 w-full max-w-[400px] items-center justify-between gap-3 bg-ink px-4 py-3 text-[14px] font-medium text-white"
          >
            <span>{t.message}</span>
            {t.action && (
              <Link
                href={t.action.href}
                onClick={() => dismissToast(t.id)}
                className="shrink-0 font-bold text-white underline underline-offset-4"
              >
                {t.action.label}
              </Link>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
