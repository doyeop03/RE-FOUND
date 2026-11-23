import type { Target } from "@/lib/scan/schemas";

/** 촬영 가이드 오버레이 — 전체 · 라벨 · 부위 클로즈업 세 가지 틀 */
export function GuideOverlay({ target }: { target: Target }) {
  const full = target === "front_full" || target === "back_full";
  const label = target === "care_label" || target === "main_tag";
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <mask id="guide-hole">
          <rect width="300" height="400" fill="white" />
          {full && <rect x="22" y="30" width="256" height="340" rx="6" fill="black" />}
          {label && <rect x="40" y="135" width="220" height="130" rx="4" fill="black" />}
          {!full && !label && <circle cx="150" cy="200" r="105" fill="black" />}
        </mask>
      </defs>
      <rect width="300" height="400" fill="black" fillOpacity="0.38" mask="url(#guide-hole)" />
      {full && (
        <>
          <rect x="22" y="30" width="256" height="340" rx="6" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 5" />
          {/* 펼친 상의 실루엣 */}
          <path
            d="M110 70 L80 82 L40 130 L62 160 L86 140 L86 330 L214 330 L214 140 L238 160 L260 130 L220 82 L190 70 Q150 96 110 70 Z"
            fill="none"
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth="1.2"
          />
        </>
      )}
      {label && <rect x="40" y="135" width="220" height="130" rx="4" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 5" />}
      {!full && !label && <circle cx="150" cy="200" r="105" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6 5" />}
      {/* 모서리 */}
      {[
        "M14 40 V14 H40",
        "M260 14 H286 V40",
        "M14 360 V386 H40",
        "M260 386 H286 V360",
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="#E60012" strokeWidth="3" />
      ))}
    </svg>
  );
}
