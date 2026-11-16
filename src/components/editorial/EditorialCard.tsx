import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { cx } from "@/lib/format";
import type { Editorial, Product } from "@/types";

export const TONE_CLASS: Record<Editorial["tone"], string> = {
  light: "bg-paper text-ink",
  dark: "bg-ink text-white",
  red: "bg-brand text-white",
};

export function EditorialCard({
  editorial,
  cover,
  large = false,
}: {
  editorial: Editorial;
  cover: Product;
  large?: boolean;
}) {
  const light = editorial.tone === "light";
  return (
    <Link href={`/magazine/${editorial.slug}`} className="group block">
      <div
        className={cx(
          "relative overflow-hidden",
          TONE_CLASS[editorial.tone],
          large ? "aspect-[4/5] md:aspect-[16/8]" : "aspect-[4/5] md:aspect-[5/5]",
        )}
      >
        <GarmentImage
          spec={cover.garment}
          label={cover.nameKo}
          className={cx(
            "absolute right-[-6%] top-[9%] h-[58%] w-[66%] transition-transform duration-500 group-hover:scale-[1.04]",
            large ? "md:right-[4%] md:top-[2%] md:h-[96%] md:w-[46%]" : "md:right-[-4%] md:top-[6%] md:h-[66%] md:w-[62%]",
          )}
        />
        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-8">
          <div className="flex items-center justify-between">
            <p className={cx("eyebrow", light ? "text-sub" : "text-white/70")}>
              {editorial.issue} · {editorial.readMinutes} MIN READ
            </p>
            <ArrowUpRight size={20} />
          </div>
          <div>
            <h3
              className={cx(
                "display max-w-[8em] text-[40px]",
                large ? "md:text-[84px]" : "md:text-[52px]",
              )}
            >
              {editorial.title}
            </h3>
            <p className={cx("mt-3 text-[14px] font-medium md:text-[16px]", light ? "text-ink" : "text-white")}>
              {editorial.subtitle}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
