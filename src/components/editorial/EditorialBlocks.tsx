import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { RarityBadge } from "@/components/ui/primitives";
import { priceRange, seasonLabel } from "@/lib/format";
import type { EditorialBlock, Product } from "@/types";

/**
 * 매거진 본문 렌더러.
 * 블록 타입별로만 분기하므로, LLM이 같은 스키마(EditorialBlock[])로 생성한 콘텐츠를 그대로 넣을 수 있다.
 */
export function EditorialBlocks({ blocks, products }: { blocks: EditorialBlock[]; products: Product[] }) {
  return (
    <div>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "lead":
            return (
              <p key={i} className="text-[20px] font-bold leading-[1.6] tracking-[-0.02em] md:text-[26px]">
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h2 key={i} className="mt-14 border-t border-ink pt-4 text-[26px] font-extrabold tracking-[-0.03em] md:mt-20 md:text-[36px]">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="mt-5 text-[16px] leading-[1.9] md:text-[17px]">
                {block.text}
              </p>
            );
          case "quote":
            return (
              <blockquote key={i} className="my-12 border-l-[3px] border-brand pl-5 md:my-16 md:pl-8">
                <p className="text-[24px] font-extrabold leading-[1.35] tracking-[-0.03em] md:text-[36px]">
                  “{block.text}”
                </p>
              </blockquote>
            );
          case "product": {
            const product = products.find((p) => p.id === block.productId);
            if (!product) return null;
            return (
              <figure key={i} className="my-10 md:my-14">
                <Link href={`/archive/${product.id}`} className="group block">
                  <div className="-mx-5 aspect-[4/3] bg-paper md:mx-0 md:aspect-[16/9]">
                    <GarmentImage spec={product.garment} label={product.nameKo} className="h-full w-full p-[5%] transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-b border-line pb-3">
                    <div className="min-w-0">
                      <RarityBadge grade={product.rarity.grade} />
                      <p className="mt-1.5 truncate text-[15px] font-extrabold">{product.name}</p>
                      <p className="truncate text-[12px] text-sub">
                        {seasonLabel(product.season)} · {priceRange(product.market)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-brand">
                      아카이브 보기 <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
                <figcaption className="mt-2 text-[13px] leading-relaxed text-sub">{block.caption}</figcaption>
              </figure>
            );
          }
        }
      })}
    </div>
  );
}
