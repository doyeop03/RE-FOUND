"use client";

import { useSyncExternalStore } from "react";

export interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; href: string };
}

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export function toast(message: string, action?: ToastItem["action"]) {
  counter += 1;
  const id = counter;
  toasts = [...toasts.slice(-1), { id, message, action }];
  emit();
  window.setTimeout(() => dismissToast(id), 3200);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => toasts,
    () => EMPTY,
  );
}
