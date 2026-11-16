import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, ScanLine } from "lucide-react";
import { EditorialCard } from "@/components/editorial/EditorialCard";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { ProductCard } from "@/components/product/ProductCard";
import {
  RarityBadge,
  SectionHeader,
  buttonLinkClass,
} from "@/components/ui/primitives";
import { CATEGORY_LABEL, priceRange, seasonLabel } from "@/lib/format";
import { RARITY_ORDER } from "@/lib/rarity";
import { getEditorials, getProducts } from "@/services/archive";
import type { Category } from "@/types";

const CATEGORIES: Category[] = ["outer", "fleece", "knit", "shirt", "tee", "pants"];

const STEPS = [
  { no: "01", title: "촬영", body: "옷의 앞면과 케어라벨을 찍어 올립니다." },
  { no: "02", title: "분석", body: "아카이브와 비교해 어떤 제품인지 찾습니다." },
  { no: "03", title: "가치 확인", body: "출시 시기, 희귀도, 매물 시세를 확인합니다." },
  { no: "04", title: "다시 순환", body: "소장하거나, 수선하거나, 다음 주인을 찾아 줍니다." },
];

export default async function HomePage() {
  const [products, editorials] = await Promise.all([getProducts(), getEditorials()]);

  const hero = products[0];
  const weekly = products.filter((p) => p.foundThisWeek);
  const rare = [...products]
    .sort((a, b) => b.rarity.score - a.rarity.score)
    .filter((p) => RARITY_ORDER[p.rarity.grade] >= 3);
  const [rareTop, ...rareRest] = rare;
  const recent = [...products]
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .slice(0, 8);

  return (
    <div>
      {/* HERO */}
      <section className="border-b border-line bg-paper">
        <div className="container-page grid md:grid-cols-2 md:items-stretch">
          <div className="relative order-2 flex flex-col justify-end pb-8 pt-2 md:order-1 md:justify-center md:py-16">
            <p className="eyebrow mb-4 text-sub">
              UNIQLO VINTAGE LOOP <span className="mx-1 text-brand">/</span> ISSUE 01
            </p>
            <h1 className="display text-[clamp(44px,13.5vw,60px)] md:text-[clamp(60px,6.6vw,92px)]">
              OLD UNIQLO,
              <br />
              NEW VALUE<span className="text-brand">.</span>
            </h1>
            <p className="mt-5 max-w-[26em] text-[16px] leading-relaxed text-ink md:text-[18px]">
              오래된 유니클로의 가치를 다시 발견하다.
              <span className="mt-1 block text-[14px] text-sub md:text-[15px]">
                옷장 속, 혹은 빈티지 숍 행거에서 찾은 한 벌이 언제 만들어졌고 얼마나 드문 옷인지 확인해 보세요.
              </span>
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Link href="/scan" className={`${buttonLinkClass.primary} sm:min-w-[200px]`}>
                <ScanLine size={18} />내 옷 스캔하기
              </Link>
              <Link href="/explore" className={`${buttonLinkClass.outline} sm:min-w-[180px]`}>
                아카이브 둘러보기
              </Link>
            </div>
          </div>

          <Link
            href={`/archive/${hero.id}`}
            className="group relative order-1 -mx-5 block md:order-2 md:mx-0"
            aria-label={`${hero.name} 아카이브 보기`}
          >
            <div className="relative mx-auto aspect-[5/5] max-h-[440px] w-full md:aspect-auto md:h-full md:max-h-none md:min-h-[560px]">
              <span
                aria-hidden
                className="display pointer-events-none absolute -right-2 top-4 select-none text-[150px] leading-none text-white md:text-[240px]"
              >
                &apos;98
              </span>
              <GarmentImage
                spec={hero.garment}
                label={hero.nameKo}
                className="relative h-full w-full p-6 transition-transform duration-500 group-hover:scale-[1.03] md:p-12"
              />
              <div className="absolute bottom-4 left-5 flex items-end gap-3 md:bottom-10 md:left-0">
                <div className="border-l-[3px] border-brand bg-white px-3 py-2">
                  <p className="eyebrow !text-[10px] text-sub">FEATURED ARCHIVE</p>
                  <p className="mt-0.5 text-[14px] font-extrabold">{hero.name}</p>
                  <p className="text-[12px] text-sub">{seasonLabel(hero.season)} · {hero.archiveType.label}</p>
                </div>
              </div>
              <span className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center bg-ink text-white md:right-0 md:top-10">
                <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* CATEGORY */}
      <section className="border-b border-line">
        <div className="container-page">
          <ul className="no-scrollbar -mx-5 flex gap-0 overflow-x-auto px-5 md:mx-0 md:px-0">
            {CATEGORIES.map((c) => (
              <li key={c} className="shrink-0">
                <Link
                  href={`/explore?category=${c}`}
                  className="flex h-14 items-center px-4 text-[14px] font-semibold text-ink hover:text-brand md:px-6"
                >
                  {CATEGORY_LABEL[c]}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link
                href="/explore?collab=1"
                className="flex h-14 items-center px-4 text-[14px] font-semibold text-brand md:px-6"
              >
                협업 컬렉션
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* WEEKLY */}
      <section className="container-page pt-12 md:pt-16">
        <SectionHeader eyebrow="This Week" title="이번 주 발견된 유니클로 아카이브" href="/explore" />
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-5 md:gap-5 md:overflow-visible md:px-0">
          {weekly.map((p, i) => (
            <ProductCard key={p.id} product={p} rank={i + 1} className="w-[44vw] max-w-[190px] shrink-0 md:w-auto md:max-w-none" />
          ))}
        </div>
      </section>

      {/* RARE */}
      <section className="mt-14 bg-ink py-12 text-white md:mt-20 md:py-16">
        <div className="container-page">
          <SectionHeader eyebrow="High Rarity" title="희귀도 높은 제품 큐레이션" href="/explore?rarity=S,A" invert />
          <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
            <Link href={`/archive/${rareTop.id}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-[#1c1c1c] md:aspect-[5/5]">
                <GarmentImage spec={rareTop.garment} label={rareTop.nameKo} className="h-full w-full p-[8%] transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="display absolute left-4 top-3 text-[88px] text-brand md:text-[120px]">
                  {rareTop.rarity.grade}
                </span>
                <span className="absolute bottom-4 right-4 text-right text-[12px] text-white/60">
                  희소성 지표 <b className="text-[20px] font-extrabold text-white">{rareTop.rarity.score}</b> / 100
                </span>
              </div>
              <div className="pt-4">
                <p className="eyebrow !text-[10px] text-white/50">{rareTop.collection}</p>
                <p className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] md:text-[24px]">{rareTop.name}</p>
                <p className="mt-1 text-[13px] text-white/60">
                  {rareTop.nameKo} · {seasonLabel(rareTop.season)} · {priceRange(rareTop.market)}
                </p>
              </div>
            </Link>
            <ul className="divide-y divide-white/15 border-y border-white/15">
              {rareRest.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <Link href={`/archive/${p.id}`} className="group flex items-center gap-4 py-4">
                    <div className="h-[84px] w-[70px] shrink-0 bg-[#1c1c1c]">
                      <GarmentImage spec={p.garment} label={p.nameKo} className="h-full w-full p-1.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <RarityBadge grade={p.rarity.grade} />
                      <p className="mt-1.5 truncate text-[15px] font-bold">{p.name}</p>
                      <p className="truncate text-[12px] text-white/60">
                        {seasonLabel(p.season)} · {priceRange(p.market)}
                      </p>
                    </div>
                    <ArrowRight size={18} className="shrink-0 text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 text-[12px] leading-relaxed text-white/40">
            희귀도 등급은 경과 연수·생산 규모·단종 여부·중고 매물량으로 산정하며, 의류 상태와 수요는 포함하지 않습니다. (데모 데이터)
          </p>
        </div>
      </section>

      {/* RECENT */}
      <section className="container-page pt-14 md:pt-20">
        <SectionHeader eyebrow="New In" title="최근 등록된 빈티지 아이템" href="/explore" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5 md:gap-y-10">
          {recent.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* EDITORIAL */}
      <section className="container-page pt-16 md:pt-24">
        <SectionHeader eyebrow="Magazine" title="빈티지 유니클로 이야기" href="/magazine" linkLabel="매거진" />
        <div className="grid gap-5 md:grid-cols-2">
          {editorials.slice(0, 2).map((e) => {
            const cover = products.find((p) => p.id === e.coverProductId) ?? products[0];
            return <EditorialCard key={e.slug} editorial={e} cover={cover} />;
          })}
        </div>
        <ul className="mt-2 divide-y divide-line border-b border-line">
          {editorials.slice(2).map((e) => (
            <li key={e.slug}>
              <Link href={`/magazine/${e.slug}`} className="group flex items-center justify-between gap-4 py-5">
                <div className="min-w-0">
                  <p className="eyebrow !text-[10px] text-sub">{e.issue}</p>
                  <p className="display mt-1.5 text-[22px] group-hover:text-brand md:text-[30px]">{e.title}</p>
                  <p className="mt-1 text-[13px] text-sub">{e.subtitle}</p>
                </div>
                <ArrowUpRight size={20} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* NEARBY */}
      <section className="container-page pt-14 md:pt-20">
        <Link href="/nearby" className="group flex items-center justify-between gap-4 border border-ink p-5 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-brand text-white">
              <MapPin size={20} />
            </span>
            <div>
              <p className="eyebrow !text-[10px] text-sub">Nearby Vintage Shops</p>
              <p className="mt-1 text-[17px] font-extrabold tracking-[-0.02em] md:text-[22px]">
                빈티지 숍에서 OLD UNIQLO를 발견해 보세요
              </p>
              <p className="mt-1 text-[13px] text-sub">근처 숍 5곳에서 RE:FOUND를 이용할 수 있어요 (가상 매장)</p>
            </div>
          </div>
          <ArrowRight size={22} className="shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page pt-16 md:pt-24">
        <SectionHeader eyebrow="How It Works" title="RE:FOUND 사용 방법" />
        <ol className="grid grid-cols-2 border-l border-t border-line md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.no} className="border-b border-r border-line p-4 md:p-6">
              <p className="display text-[34px] text-brand md:text-[44px]">{s.no}</p>
              <p className="mt-3 text-[16px] font-extrabold md:text-[18px]">{s.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-sub">{s.body}</p>
            </li>
          ))}
        </ol>
        <Link href="/scan" className={`${buttonLinkClass.dark} mt-5 w-full md:w-auto md:min-w-[240px]`}>
          지금 스캔 시작하기
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
