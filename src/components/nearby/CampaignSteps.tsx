/** Figma 07 — 캠페인 참여 방법 */
const STEPS = [
  { title: "빈티지 숍 방문", body: "RE:FOUND 참여 숍에서\n올드 유니클로를 찾아보세요." },
  { title: "발견하고 구매", body: "마음에 드는 빈티지 유니클로를\n매장에서 구매합니다." },
  { title: "사진 등록", body: "구매한 옷의 앞면과 케어라벨을 촬영합니다." },
  { title: "가치 발견·기록", body: "다섯 지표로 빈티지 유형을 확인하고,\n소장·수선·재판매를 경험해 보세요." },
];

export function CampaignSteps() {
  return (
    <div>
      <ol className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-b border-r border-line p-5">
            <p className="text-[36px] font-bold leading-none tracking-[-0.03em] text-brand">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-4 text-[16px] font-bold">{s.title}</p>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-sub">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12px] leading-relaxed text-faint">
        참여 숍 근처의 위치 기반 알림으로 캠페인을 안내하고, 구매 후 제품 등록으로 연결합니다. 위치 알림은 후속 개발 예정 기능입니다.
      </p>
    </div>
  );
}
