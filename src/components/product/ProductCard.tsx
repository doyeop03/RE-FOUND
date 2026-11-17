import Link from "next/link";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { RarityBadge } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { cx, priceRange, seasonLabel } from "@/lib/format";
import type { Product } from "@/types";
import { LikeButton } from "./LikeButton";

interface Props {
  product: Product;
  rank?: number;
  className?: string;
  invert?: boolean;
}

export function ProductCard({ product, rank, className, invert }: Props) {
  return (
    <Link
      href={`/archive/${product.id}`}
      className={cx("group block min-w-0", className)}
    >
      <div className={cx("relative aspect-[4/5] overflow-hidden", invert ? "bg-[#1c1c1c]" : "bg-paper")}>
        <GarmentImage
          spec={product.garment}
          label={product.nameKo}
          className="h-full w-full p-[6%] transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {rank !== undefined && (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center bg-white px-1 text-[11px] font-extrabold text-ink">
              {rank}
            </span>
          )}
          <RarityBadge grade={product.rarity.grade} />
        </div>
        {product.verification && (
          <VerificationBadge
            status={product.verification.status}
            size="xs"
            className="absolute bottom-2 left-2"
          />
        )}
        <LikeButton
          productId={product.id}
          className={cx("absolute right-0 top-0", invert && "[&_svg:not(.fill-brand)]:text-white")}
        />
      </div>
      <div className="pt-3">
        <p className={cx("eyebrow truncate !text-[10px]", invert ? "text-white/50" : "text-sub")}>
          {product.collection}
        </p>
        <p className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug tracking-[-0.02em]">
          {product.name}
        </p>
        <p className={cx("mt-0.5 truncate text-[12px]", invert ? "text-white/60" : "text-sub")}>
          {product.nameKo} · {seasonLabel(product.season)}
        </p>
        <p className="mt-2 text-[14px] font-extrabold tracking-[-0.02em]">
          {product.market ? (
            priceRange(product.market)
          ) : (
            <span className={cx("font-medium", invert ? "text-white/50" : "text-faint")}>
              가격 정보 없음
            </span>
          )}
        </p>
        {product.market && (
          <p className={cx("text-[11px]", invert ? "text-white/40" : "text-faint")}>
            매물 호가 · {product.market.listings}건
          </p>
        )}
      </div>
    </Link>
  );
}
