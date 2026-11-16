import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EditorialCard } from "@/components/editorial/EditorialCard";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { getEditorials, getProducts } from "@/services/archive";

export const metadata: Metadata = { title: "매거진" };

export default async function MagazinePage() {
  const [editorials, products] = await Promise.all([getEditorials(), getProducts()]);
  const coverOf = (id: string) => products.find((p) => p.id === id) ?? products[0];
  const [lead, ...rest] = editorials;

  return (
    <div className="container-page pt-6 md:pt-10">
      <div className="flex items-end justify-between border-b-2 border-ink pb-4">
        <div>
          <p className="eyebrow text-brand">Vintage Magazine</p>
          <h1 className="display mt-2 text-[44px] md:text-[96px]">THE LOOP</h1>
        </div>
        <p className="hidden pb-2 text-right text-[13px] text-sub md:block">
          오래된 유니클로에 관한 이야기
          <br />
          VOL. 01 — 2026 F/W
        </p>
      </div>

      <div className="mt-5">
        <EditorialCard editorial={lead} cover={coverOf(lead.coverProductId)} large />
        <p className="mt-3 max-w-[40em] text-[14px] leading-relaxed text-sub">{lead.summary}</p>
      </div>

      <ul className="mt-12 md:mt-20">
        {rest.map((e, i) => {
          const cover = coverOf(e.coverProductId);
          return (
            <li key={e.slug} className="border-t border-ink">
              <Link href={`/magazine/${e.slug}`} className="group grid gap-4 py-6 md:grid-cols-[120px_1fr_260px] md:items-center md:gap-10 md:py-10">
                <p className="display text-[40px] text-brand md:text-[64px]">{String(i + 2).padStart(2, "0")}</p>
                <div>
                  <p className="eyebrow !text-[10px] text-sub">{e.issue} · {e.readMinutes} MIN READ</p>
                  <h2 className="display mt-2 text-[34px] group-hover:text-brand md:text-[56px]">{e.title}</h2>
                  <p className="mt-2 text-[16px] font-bold">{e.subtitle}</p>
                  <p className="mt-2 max-w-[36em] text-[14px] leading-relaxed text-sub">{e.summary}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold">
                    읽어 보기 <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="aspect-[4/3] bg-paper md:aspect-[4/5]">
                  <GarmentImage spec={cover.garment} label={cover.nameKo} className="h-full w-full p-[8%] transition-transform duration-500 group-hover:scale-[1.04]" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
