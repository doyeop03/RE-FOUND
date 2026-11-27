import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, ScanLine } from "lucide-react";
import codeSeasonImg from "@/assets/verification/code-season.svg";
import conditionImg from "@/assets/verification/condition.svg";
import fabricSewingImg from "@/assets/verification/fabric-sewing.svg";
import hardwareImg from "@/assets/verification/hardware.svg";
import tagLabelImg from "@/assets/verification/tag-label.svg";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeader, buttonLinkClass } from "@/components/ui/primitives";
import { CATEGORY_LABEL, seasonLabel } from "@/lib/format";
import { getProducts } from "@/services/archive";
import type { Category } from "@/types";

const CATEGORIES: Category[] = ["outer", "fleece", "knit", "shirt", "tee", "pants"];

const STEPS = [
  { no: "01", title: "촬영", body: "옷의 앞면과 태그/라벨을 찍어 올립니다." },
  { no: "02", title: "분석", body: "아카이브와 비교해 어떤 제품인지 찾습니다." },
  { no: "03", title: "가치 확인", body: "수요성·서사성·시대성·대표성·보존성을 살펴봅니다." },
  { no: "04", title: "다시 순환", body: "소장하거나, 수선하거나, 재판매 합니다." },
];

const CLUES: { no: string; title: string; body: [string, string]; img: StaticImageData }[] = [
  { no: "01", title: "택 · 케어라벨", body: ["로고·세탁 표기를", "시대별 샘플과 대조"], img: tagLabelImg },
  { no: "02", title: "품번 · 시즌", body: ["상품 코드와 시즌을", "출시 기록에서 확인"], img: codeSeasonImg },
  { no: "03", title: "소재 · 봉제", body: ["원단 조직과 봉제를", "기록된 사양과 비교"], img: fabricSewingImg },
  { no: "04", title: "부자재", body: ["지퍼·단추의 형태와", "교체 흔적을 확인"], img: hardwareImg },
  { no: "05", title: "상태 검수", body: ["보풀·변색·손상 등", "현재 상태를 기록"], img: conditionImg },
];

export default async function HomePage() {
  const products = await getProducts();

  const hero = products[0];
  const weekly = products.filter((p) => p.foundThisWeek);
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
                옷장 속, 혹은 빈티지 숍에서 발견한 빈티지
                <br />
                이제 올드유니클로의 가치를 쉽게 확인해 보세요.
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

      {/* HOW IT WORKS */}
      <section className="container-page pb-14 pt-14 md:pb-20 md:pt-24">
        <SectionHeader eyebrow="How It Works" title="RE:FOUND 사용 방법" />
        <ol className="grid grid-cols-2 border-l border-t border-line md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.no} className="border-b border-r border-line p-4 md:p-6 md:pb-11">
              <p className="display text-[34px] text-brand md:text-[44px]">{s.no}</p>
              <p className="mt-3 text-[16px] font-extrabold md:text-[17px]">{s.title}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-sub">{s.body}</p>
            </li>
          ))}
        </ol>
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
            <ProductCard
              key={p.id}
              product={p}
              rank={i + 1}
              badge="type"
              className="w-[44vw] max-w-[190px] shrink-0 md:w-auto md:max-w-none"
            />
          ))}
        </div>
      </section>

      {/* VERIFICATION CRITERIA */}
      <section className="mt-12 bg-ink py-14 text-white md:mt-4 md:pb-28 md:pt-24">
        <div className="container-page flex flex-col gap-5 md:gap-7">
          <p className="text-[12px] text-[#aaa]">VINTAGE VERIFICATION</p>
          <h2 className="text-[26px] font-bold leading-tight md:text-[32px]">RE:FOUND 검증 기준</h2>
          <p className="text-[15px] text-[#c5c5c5] md:text-[17px]">
            옷의 다섯 가지 단서를 살펴, 아카이브 기록과 비교합니다.
          </p>
          <ol className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
            {CLUES.map((c) => (
              <li
                key={c.no}
                className="flex w-[180px] shrink-0 flex-col items-start gap-[18px] border border-[#363636] bg-[#1d1d1d] px-[18px] py-[22px] md:w-auto"
              >
                <p className="text-[13px] font-bold text-[#ff4655]">{c.no}</p>
                <Image src={c.img} alt="" width={110} height={110} />
                <p className="text-[18px] font-bold">{c.title}</p>
                <p className="text-[14px] leading-[1.6] text-[#c5c5c5]">
                  {c.body[0]}
                  <br />
                  {c.body[1]}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-[13px] leading-[1.7] text-[#aaa] md:text-[14px]">
            판단이 어려운 단서가 있다면 &lsquo;추가 확인 필요&rsquo;로 분류하고 사진이나 자료 보완을 요청합니다. 상태 평가와 정품
            검증은 별개이며, 손상이 있어도 그 옷의 아카이브 가치는 남아 있어요.
          </p>
        </div>
      </section>

      {/* RECENT */}
      <section className="container-page pt-14 md:pt-20">
        <SectionHeader eyebrow="New In" title="최근 등록된 빈티지 아이템" href="/explore" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5 md:gap-y-14">
          {recent.map((p) => (
            <ProductCard key={p.id} product={p} badge="type" />
          ))}
        </div>
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
    </div>
  );
}
