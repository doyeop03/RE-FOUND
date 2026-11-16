import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarX, Clock, MapPin, ScanLine } from "lucide-react";
import { CampaignSteps } from "@/components/nearby/CampaignSteps";
import { ProductCard } from "@/components/product/ProductCard";
import { DemoTag, SectionHeader, buttonLinkClass } from "@/components/ui/primitives";
import { getProductsByIds, getShop, getShops } from "@/services/archive";

export async function generateStaticParams() {
  const shops = await getShops();
  return shops.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/nearby/[id]">): Promise<Metadata> {
  const { id } = await params;
  const shop = await getShop(id);
  return { title: shop ? shop.name : "빈티지 숍" };
}

export default async function ShopPage({ params }: PageProps<"/nearby/[id]">) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) notFound();
  const found = await getProductsByIds(shop.foundProductIds);

  const info = [
    { icon: MapPin, label: "주소", value: shop.address },
    { icon: Clock, label: "영업 시간", value: shop.hours },
    { icon: CalendarX, label: "휴무", value: shop.closed },
  ];

  return (
    <div className="container-page pt-2 md:pt-6">
      <Link href="/nearby" className="-ml-2 flex h-11 w-fit items-center gap-1.5 px-2 text-[13px] font-bold">
        <ArrowLeft size={16} /> 빈티지 숍 목록
      </Link>

      <header className="mt-2 border-b-2 border-ink pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow text-brand">{shop.area} · {shop.distanceKm}km</p>
          {shop.partner && (
            <span className="border border-brand px-1.5 py-0.5 text-[10px] font-bold text-brand">RE:FOUND 참여 숍</span>
          )}
          <DemoTag>가상 매장</DemoTag>
        </div>
        <h1 className="display mt-3 text-[48px] md:text-[88px]">{shop.name}</h1>
        <p className="mt-4 max-w-[36em] text-[16px] leading-relaxed">{shop.description}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {shop.tags.map((t) => (
            <li key={t} className="bg-paper px-2.5 py-1.5 text-[12px] font-semibold">{t}</li>
          ))}
        </ul>
      </header>

      <div className="grid gap-6 pt-6 md:grid-cols-[1fr_320px] md:gap-12">
        <dl className="divide-y divide-line border-b border-line">
          {info.map((row) => (
            <div key={row.label} className="flex items-start gap-3 py-4">
              <row.icon size={18} strokeWidth={1.7} className="mt-0.5 shrink-0" />
              <dt className="w-[72px] shrink-0 text-[13px] text-sub">{row.label}</dt>
              <dd className="text-[14px] font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="border border-ink p-5">
          <p className="text-[16px] font-extrabold">이 매장에서 RE:FOUND 이용하기</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-sub">
            매장에서 오래된 유니클로를 발견하면 바로 촬영해 보세요. 구매 전에 출시 시기와 희귀도를 확인할 수 있어요.
          </p>
          <Link href="/scan" className={`${buttonLinkClass.primary} mt-4 w-full`}>
            <ScanLine size={18} /> 발견한 옷 스캔하기
          </Link>
        </div>
      </div>

      <section className="mt-14 md:mt-20">
        <SectionHeader eyebrow="Found Here" title="이 매장에서 발견된 아카이브" href="/explore" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
          {found.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mt-14 md:mt-20">
        <SectionHeader eyebrow="Campaign" title="캠페인 참여 방법" />
        <CampaignSteps />
      </section>
    </div>
  );
}
