const STEPS = [
  { title: "빈티지 숍 방문", body: "RE:FOUND 참여 숍에서 오래된 유니클로를 찾아보세요." },
  { title: "제품 촬영", body: "발견한 옷의 앞면과 케어라벨을 촬영합니다." },
  { title: "가치 발견", body: "출시 시기와 희귀도, 매물 시세를 그 자리에서 확인합니다." },
  { title: "옷장에 기록", body: "구매했다면 나의 옷장에 저장하고 다음 순환으로 이어 가세요." },
];

export function CampaignSteps() {
  return (
    <div>
      <ol className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-b border-r border-line p-5">
            <p className="display text-[36px] text-brand">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-3 text-[16px] font-extrabold">{s.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-sub">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12px] leading-relaxed text-faint">
        후속 개발 예정: 참여 숍 근처에 가면 “OLD UNIQLO를 발견하셨나요?” 위치 기반 푸시 알림을 보내 촬영 화면으로 바로 연결합니다.
        현재 프로토타입에는 포함되어 있지 않습니다.
      </p>
    </div>
  );
}
