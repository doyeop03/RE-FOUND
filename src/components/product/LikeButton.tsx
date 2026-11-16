"use client";

import { Heart } from "lucide-react";
import { cx } from "@/lib/format";
import { toggleLike, useAppState } from "@/store/app-store";
import { toast } from "@/store/toast-store";

export function LikeButton({
  productId,
  className,
  size = 20,
}: {
  productId: string;
  className?: string;
  size?: number;
}) {
  const { likes } = useAppState();
  const liked = likes.includes(productId);

  return (
    <button
      type="button"
      aria-label={liked ? "찜 해제" : "찜하기"}
      aria-pressed={liked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = toggleLike(productId);
        toast(
          now ? "찜한 제품에 추가했어요" : "찜을 해제했어요",
          now ? { label: "보러 가기", href: "/my?tab=liked" } : undefined,
        );
      }}
      className={cx("flex h-11 w-11 items-center justify-center", className)}
    >
      <Heart
        size={size}
        strokeWidth={1.8}
        className={cx(
          "transition-transform active:scale-125",
          liked ? "fill-brand text-brand" : "text-ink",
        )}
      />
    </button>
  );
}
