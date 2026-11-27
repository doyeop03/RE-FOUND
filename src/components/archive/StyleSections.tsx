import { Layers, Lightbulb, Package, WashingMachine } from "lucide-react";
import { SectionTitle } from "@/components/archive/SectionTitle";
import { cx } from "@/lib/format";
import type { CurationImage } from "@/data/demo-scan";
import type { CareGuide } from "@/types";

/** 그때의 옷, 지금의 스타일 — 자료 사진 자리 (Figma 05 · 09) */
export function StyleThroughTime({
  categoryLabel,
  className,
  media,
}: {
  categoryLabel: string;
  className?: string;
  /** 자료 사진이 있으면 플레이스홀더 대신 보여 준다 */
  media?: { then: CurationImage; now: CurationImage } | null;
}) {
  const cards = [
    {
      tag: "THEN · 당시의 스타일",
      placeholder: "당시 유니클로 잡지·모델 사진",
      title: "당시에는 이렇게 입었어요",
      body: "당시 잡지와 모델 착장으로 제품이 제안했던 실루엣과 코디를 살펴보세요.",
      source: "출처: 유니클로 잡지·카탈로그 / 연도·시즌 표기",
      image: media?.then ?? null,
    },
    {
      tag: "NOW · 지금의 스타일",
      placeholder: "최근 스타일링·착용 사진",
      title: "지금은 이렇게 활용해요",
      body: `비슷한 ${categoryLabel} 아이템을 활용한 최근 착장으로 오늘의 코디를 제안합니다.`,
      source: "출처: 스타일링 콘텐츠·착용자 / 게시일 표기",
      image: media?.now ?? null,
    },
  ];
  return (
    <section className={cx("border-t border-line pt-12 md:pt-14", className)}>
      <p className="text-[11px] font-bold tracking-[0.02em] text-brand">STYLE THROUGH TIME</p>
      <h2 className="mt-4 text-[26px] font-bold tracking-[-0.03em] md:mt-6 md:text-[32px]">그때의 옷, 지금의 스타일</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-sub md:mt-5 md:text-[15px]">
        당시의 착장과 오늘의 활용법을 함께 보며, 이 옷을 다시 입을 방법을 발견하세요.
      </p>
      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-8">
        {cards.map((c) => (
          <div key={c.tag}>
            <p className="text-[15px] font-bold text-brand">{c.tag}</p>
            {c.image ? (
              <div className="mt-3 aspect-[4/5] overflow-hidden bg-[#f3f3f3]">
                {/* eslint-disable-next-line @next/next/no-img-element -- 정적 내보내기 · 화보 사진은 세로 비율 그대로 꽉 채운다 */}
                <img src={c.image.src} alt={c.image.alt} className="h-full w-full object-cover object-top" />
              </div>
            ) : (
              <div className="mt-3 flex aspect-[552/360] flex-col items-center justify-center border border-line bg-[#f3f3f3] px-4 text-center">
                <p className="text-[16px] font-bold text-[#777] md:text-[18px]">{c.placeholder}</p>
                <p className="mt-2 text-[10px] text-faint">IMAGE PLACEHOLDER · 자료 사진 삽입 영역</p>
              </div>
            )}
            <h3 className="mt-5 text-[20px] font-bold tracking-[-0.02em] md:text-[22px]">{c.title}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-sub md:text-[15px]">{c.body}</p>
            <p className="mt-3 text-[11px] text-faint">{c.image?.source ?? c.source}</p>
          </div>
        ))}
      </div>
      {!media && (
        <p className="mt-8 text-[11px] leading-relaxed text-faint">
          두 사진은 실제 자료로 교체할 자리입니다. 동일 제품과 유사 아이템을 구분하고 각 이미지의 출처를 표시합니다.
        </p>
      )}
    </section>
  );
}

/** 소재와 관리 가이드 (Figma 05 · 09) */
export function CareGuideSection({ care, index = "05", className }: { care: CareGuide; index?: string; className?: string }) {
  const blocks = [
    { icon: Layers, title: "소재 정보", items: care.material },
    { icon: WashingMachine, title: "세탁 방법", items: care.washing },
    { icon: Package, title: "보관 가이드", items: care.storage },
    { icon: Lightbulb, title: "상태 유지 팁", items: care.tips },
  ];
  return (
    <section className={className}>
      <SectionTitle index={index} en="Material & Care" title="소재와 관리 가이드" />
      <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {blocks.map((b) => (
          <div key={b.title} className="bg-white p-5">
            <b.icon size={22} strokeWidth={1.6} />
            <h3 className="mt-3 text-[15px] font-bold">{b.title}</h3>
            <ul className="mt-3 space-y-2">
              {b.items.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink">
                  <span className="mt-[9px] h-px w-2.5 shrink-0 bg-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
