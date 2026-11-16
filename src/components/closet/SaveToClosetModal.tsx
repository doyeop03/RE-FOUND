"use client";

import { useState } from "react";
import { Shirt, Store } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { cx } from "@/lib/format";
import { addToCloset } from "@/store/app-store";
import { toast } from "@/store/toast-store";
import type { Ownership, Product } from "@/types";

const OPTIONS: { value: Ownership; icon: typeof Store; title: string; body: string }[] = [
  {
    value: "found",
    icon: Store,
    title: "빈티지 숍에서 발견했어요",
    body: "발견한 옷으로 도감에 기록합니다.",
  },
  {
    value: "owned",
    icon: Shirt,
    title: "내가 가지고 있는 옷이에요",
    body: "소유한 옷으로 등록하고 수선·재판매로 이어갈 수 있어요.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product;
  conditionLabel?: string;
  onSaved?: () => void;
}

export function SaveToClosetModal({ open, onClose, product, conditionLabel, onSaved }: Props) {
  const [ownership, setOwnership] = useState<Ownership>("found");
  const [place, setPlace] = useState("");

  const save = () => {
    addToCloset({
      productId: product.id,
      ownership,
      conditionLabel: conditionLabel ?? product.condition.label,
      place: ownership === "found" && place.trim() ? place.trim() : undefined,
    });
    toast("나의 옷장에 저장했어요", { label: "옷장 보기", href: "/my" });
    onSaved?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="나의 옷장에 저장" eyebrow="My Archive">
      <p className="text-[14px] text-sub">
        <b className="text-ink">{product.name}</b>을(를) 어떻게 기록할까요?
      </p>
      <div className="mt-4 space-y-2">
        {OPTIONS.map((o) => {
          const active = ownership === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => setOwnership(o.value)}
              className={cx(
                "flex w-full items-center gap-3 border p-4 text-left transition-colors",
                active ? "border-brand bg-brand-tint" : "border-line hover:border-ink",
              )}
            >
              <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center", active ? "bg-brand text-white" : "bg-paper")}>
                <o.icon size={20} />
              </span>
              <span>
                <span className="block text-[15px] font-bold">{o.title}</span>
                <span className="mt-0.5 block text-[13px] text-sub">{o.body}</span>
              </span>
            </button>
          );
        })}
      </div>
      {ownership === "found" && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-bold">발견한 곳 (선택)</span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="예: 세컨드룸 · 성수"
            className="h-12 w-full border border-line px-3 text-[15px] outline-none focus:border-ink"
          />
        </label>
      )}
      <Button className="mt-6 w-full" onClick={save}>
        저장하기
      </Button>
    </Modal>
  );
}
