import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { EditorialBlocks } from "@/components/editorial/EditorialBlocks";
import { TONE_CLASS } from "@/components/editorial/EditorialCard";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { ProductCard } from "@/components/product/ProductCard";
import { DemoTag, SectionHeader } from "@/components/ui/primitives";
import { cx } from "@/lib/format";
import {
  getEditorial,
  getEditorials,
  getProducts,
  getProductsByIds,
} from "@/services/archive";

export async function generateStaticParams() {
  const editorials = await getEditorials();
  return editorials.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/magazine/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const editorial = await getEditorial(slug);
  return { title: editorial ? editorial.title : "매거진" };
}

export default async function EditorialPage({ params }: PageProps<"/magazine/[slug]">) {
  const { slug } = await params;
  const editorial = await getEditorial(slug);
  if (!editorial) notFound();

  const [products, related, all] = await Promise.all([
    getProducts(),
    getProductsByIds(editorial.relatedProductIds),
    getEditorials(),
  ]);
  const cover = products.find((p) => p.id === editorial.coverProductId) ?? products[0];
  const light = editorial.tone === "light";
  const next = all[(all.findIndex((e) => e.slug === editorial.slug) + 1) % all.length];

  return (
    <article>
      {/* 커버 */}
      <header className={cx("relative overflow-hidden", TONE_CLASS[editorial.tone])}>
        <div className="container-page relative flex min-h-[560px] flex-col justify-between py-5 md:min-h-[640px] md:py-10">
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/magazine" className="-ml-2 flex h-11 items-center gap-1.5 px-2 text-[13px] font-bold">
              <ArrowLeft size={16} /> THE LOOP
            </Link>
            <p className={cx("eyebrow", light ? "text-sub" : "text-white/70")}>
              {editorial.issue} · {editorial.readMinutes} MIN READ
            </p>
          </div>
          <GarmentImage
            spec={cover.garment}
            label={cover.nameKo}
            className="absolute right-[-10%] top-[9%] h-[54%] w-[78%] md:top-auto md:bottom-0 md:right-[2%] md:h-[96%] md:w-[46%]"
          />
          <div className="relative z-10">
            <h1 className="display max-w-[7em] text-[clamp(52px,16vw,72px)] md:text-[clamp(80px,9vw,136px)]">
              {editorial.title}
            </h1>
            <p className="mt-4 text-[18px] font-bold md:text-[24px]">{editorial.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="container-page">
        <div className="mx-auto max-w-[720px] pt-10 md:pt-16">
          <p className="mb-8 flex items-center gap-2 text-[12px] text-sub">
            <DemoTag>DEMO</DemoTag>
            예시 원고입니다. 향후 제품 정보에 맞춰 AI가 생성할 예정입니다.
          </p>
          <EditorialBlocks blocks={editorial.blocks} products={products} />
        </div>

        <section className="mt-16 md:mt-24">
          <SectionHeader eyebrow="In This Story" title="이 글에 나온 아카이브" href="/explore" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        <Link href={`/magazine/${next.slug}`} className="group mt-16 flex items-center justify-between gap-4 border-y-2 border-ink py-6 md:mt-24 md:py-10">
          <div>
            <p className="eyebrow text-sub">Next Story</p>
            <p className="display mt-2 text-[30px] group-hover:text-brand md:text-[56px]">{next.title}</p>
            <p className="mt-1 text-[14px] text-sub">{next.subtitle}</p>
          </div>
          <ArrowUpRight size={28} className="shrink-0" />
        </Link>
      </div>
    </article>
  );
}
