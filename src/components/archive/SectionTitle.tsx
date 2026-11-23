/** 상세 페이지 섹션 제목 — 데모 상세 · 실제 레코드 상세가 함께 쓴다 */
export function SectionTitle({ index, en, title, note }: { index: string; en: string; title: string; note?: string }) {
  return (
    <div className="mb-6 border-t-2 border-ink pt-4 md:mb-8">
      <p className="eyebrow text-sub">
        <span className="text-brand">{index}</span> — {en}
      </p>
      <h2 className="mt-2 text-[24px] font-extrabold tracking-[-0.03em] md:text-[32px]">{title}</h2>
      {note && <p className="mt-2 max-w-[44em] text-[13px] leading-relaxed text-sub">{note}</p>}
    </div>
  );
}
