import Image from "next/image";
import Link from "next/link";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { RarityBadge } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/verification/VerificationBadge";
import { PRODUCT_PHOTOS } from "@/data/product-photos";
import { cx, priceRange, seasonLabel, won } from "@/lib/format";
import type { Listing, Product } from "@/types";
import { productHref } from "@/lib/product-links";
import { LikeButton } from "./LikeButton";

interface Props {
  product: Product;
  rank?: number;
  className?: string;
  invert?: boolean;
  /** 왼쪽 위 배지 — rarity: 희귀도 등급(기본), type: 빈티지 유형 */
  badge?: "rarity" | "type";
  /** 판매 정보 — 판매 중이면 판매가와 구매 상세(/market)로, 품절이면 흐리게 표시한다 (Figma 08) */
  listing?: Listing | null;
  /** 인증 배지 · 매물 수를 숨긴 간결한 카드 (Figma 08) */
  plain?: boolean;
  /** 일러스트 대신 판매 상품 사진을 쓴다 (발견하기) */
  photo?: boolean;
}

export function ProductCard({ product, rank, className, invert, badge = "rarity", listing, plain, photo }: Props) {
  const picture = photo ? PRODUCT_PHOTOS[product.id] : undefined;
  const onSale = listing?.status === "on_sale";
  const soldOut = listing?.status === "sold_out";
  return (
    <Link
      href={productHref(product.id, onSale ? "market" : "detail")}
      className={cx("group block min-w-0", className)}
    >
      <div className={cx("relative aspect-[4/5] overflow-hidden", invert ? "bg-[#1c1c1c]" : "bg-paper")}>
        {picture ? (
          <Image
            src={picture}
            alt={product.nameKo}
            fill
            sizes="(min-width: 1280px) 220px, (min-width: 768px) 30vw, 50vw"
            className={cx("object-cover transition-transform duration-300 group-hover:scale-[1.04]", soldOut && "opacity-45 grayscale")}
          />
        ) : (
          <GarmentImage
            spec={product.garment}
            label={product.nameKo}
            className={cx("h-full w-full p-[6%] transition-transform duration-300 group-hover:scale-[1.04]", soldOut && "opacity-45 grayscale")}
          />
        )}
        {soldOut && (
          <span className="absolute left-1/2 top-1/2 flex h-[52%] w-[33%] -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#2b2b2b] text-[15px] font-bold text-white">
            품절
          </span>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          {rank !== undefined && (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center bg-white px-1 text-[11px] font-extrabold text-ink">
              {rank}
            </span>
          )}
          {badge === "type" ? (
            <span className={cx("flex h-[22px] items-center px-1.5 text-[10px] font-medium text-white", soldOut ? "bg-[#9a9a9a]" : "bg-ink")}>
              {product.archiveType.label}
            </span>
          ) : (
            <RarityBadge grade={product.rarity.grade} />
          )}
        </div>
        {product.verification && !plain && (
          <VerificationBadge
            status={product.verification.status}
            size="xs"
            className="absolute bottom-2 left-2"
          />
        )}
        <LikeButton
          productId={product.id}
          className={cx("absolute right-0 top-0", invert && "[&_svg:not(.fill-brand)]:text-white", soldOut && "opacity-50", picture && "[&_svg]:drop-shadow-[0_0_3px_rgba(255,255,255,0.95)]")}
        />
      </div>
      <div className="pt-3">
        <p className={cx("eyebrow truncate !text-[10px]", invert ? "text-white/50" : "text-sub")}>
          {product.cardLabel ?? product.collection}
        </p>
        <p className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug tracking-[-0.02em]">
          {product.name}
        </p>
        <p className={cx("mt-0.5 truncate text-[12px]", invert ? "text-white/60" : "text-sub")}>
          {product.nameKo} · {seasonLabel(product.season)}
        </p>
        <p className="mt-2 text-[14px] font-extrabold tracking-[-0.02em]">
          {onSale && listing ? (
            `₩${won(listing.price)}`
          ) : product.market ? (
            priceRange(product.market)
          ) : (
            <span className={cx("font-medium", invert ? "text-white/50" : "text-faint")}>
              가격 정보 없음
            </span>
          )}
        </p>
        {product.market && !plain && (
          <p className={cx("text-[11px]", invert ? "text-white/40" : "text-faint")}>
            매물 호가 · {product.market.listings}건
          </p>
        )}
      </div>
    </Link>
  );
}
