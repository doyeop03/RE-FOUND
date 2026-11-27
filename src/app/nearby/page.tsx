import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { CampaignSteps } from "@/components/nearby/CampaignSteps";
import { NearbyView } from "@/components/nearby/NearbyView";
import { SectionHeader, buttonLinkClass } from "@/components/ui/primitives";
import { getShops } from "@/services/archive";

export const metadata: Metadata = { title: "빈티지 숍" };

export default async function NearbyPage() {
  const shops = await getShops();
  return (
    <div className="container-page pt-6 md:pt-10">
      <p className="eyebrow text-brand">Nearby</p>
      <h1 className="display mt-2 text-[40px] md:text-[64px]">VINTAGE SHOPS</h1>
      <p className="mt-2 text-[14px] text-sub">
        근처 빈티지 숍에서 오래된 유니클로를 발견해 보세요. 표시된 매장과 위치는 모두 가상의 데모 데이터입니다.
      </p>

      <div className="mt-6">
        <NearbyView shops={shops} />
      </div>

      <section className="mt-12 flex flex-col gap-5 bg-ink p-6 text-white md:mt-[60px] md:flex-row md:items-center md:justify-between md:px-10 md:py-11">
        <div>
          <p className="eyebrow text-white/60">In-Store Guide</p>
          <p className="mt-3 text-[22px] font-bold leading-snug tracking-[-0.03em] md:text-[28px]">
            빈티지 숍에서 구매한 유니클로,
            <br />
            어떤 이야기를 간직하고 있을까요?
          </p>
        </div>
        <Link href="/scan" className={`${buttonLinkClass.primary} md:min-w-[248px]`}>
          <ScanLine size={18} /> 구매한 옷 스캔하기
        </Link>
      </section>

      <section className="mt-14 md:mt-20">
        <SectionHeader eyebrow="Campaign" title="캠페인 참여 방법" />
        <CampaignSteps />
      </section>
    </div>
  );
}
