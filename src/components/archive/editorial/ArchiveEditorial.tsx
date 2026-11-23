"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { ImageSlot } from "@/components/archive/ImageSlot";
import { StatusChip, factText } from "@/components/archive/record/FactChip";
import { ZoomViewer } from "@/components/ui/ZoomViewer";
import { cx } from "@/lib/format";
import type { ArchiveRecord, Fact, RecordImage, RecordSource, StoryBlock } from "@/types/archive-record";

/**
 * ARCHIVE EDITORIAL — 상품 상세 페이지 안의 매거진 꼭지.
 * 큰 영문 타이포 + 큰 이미지 + 짧은 큐레이션 문장. 확인된 자료가 없는 칸은 비워 두고 그 사실을 적는다.
 */

const ROMAN = ["I", "II", "III", "IV", "V"];

function Chapter({ no, en, ko, children, id }: { no: number; en: string; ko: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 pt-14 md:pt-24">
      <header className="mb-6 flex items-end justify-between gap-4 md:mb-10">
        <div>
          <p className="eyebrow !text-[10px] text-sub">
            <span className="text-brand">{ROMAN[no - 1]}.</span> {ko}
          </p>
          <h3 className="display mt-2 text-[34px] md:text-[64px]">{en}</h3>
        </div>
      </header>
      {children}
    </section>
  );
}

const RELATION_LABEL: Record<RecordImage["relation"], string> = {
  same_item: "동일 실물",
  same_collection: "같은 컬렉션 자료",
  brand_archive: "관련 브랜드 아카이브 · 이 제품 아님",
  user_capture: "내가 촬영한 실물",
};

const SCOPE_LABEL: Record<StoryBlock["scope"], string> = {
  product: "이 제품 확인 자료",
  collection: "같은 컬렉션 자료",
  brand: "브랜드 아카이브 · 이 제품의 이력 아님",
};

const SOURCE_SCOPE_LABEL: Record<RecordSource["scope"], string> = {
  product: "이 제품 자료",
  collection: "같은 컬렉션",
  brand: "브랜드 일반",
  item_listing: "동일 실물 판매글",
};

function SourceRefs({ ids, sources }: { ids: string[]; sources: RecordSource[] }) {
  if (!ids.length) return null;
  return (
    <span className="ml-1 inline-flex gap-0.5 align-super text-[10px] font-bold">
      {ids.map((id) => {
        const n = sources.findIndex((s) => s.id === id) + 1;
        if (!n) return null;
        return (
          <a key={id} href={`#src-${id}`} className="text-brand hover:underline" aria-label={`출처 ${n}`}>
            [{n}]
          </a>
        );
      })}
    </span>
  );
}

export function ArchiveEditorial({ record, index = "05" }: { record: ArchiveRecord; index?: string }) {
  const { editorial: ed, sources } = record;
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(null);
  const open = useCallback((src: string, caption: string) => setZoom({ src, caption }), []);
  const close = useCallback(() => setZoom(null), []);

  const img = (id: string | null) => (id ? record.images.find((i) => i.id === id) ?? null : null);
  const src = (i: RecordImage | null) => (i?.sourceId ? sources.find((s) => s.id === i.sourceId) ?? null : null);
  const regKey = (slot: string) => `${record.id}:${slot}`;
  const lookbook = img(ed.lookbook.imageId);

  const factRows: { label: string; f: Fact<unknown>; fmt?: string }[] = [
    { label: "출시연도", f: record.releaseYear },
    { label: "출시 시즌", f: record.releaseSeason },
    { label: "연대 표기", f: record.eraClaim },
    { label: "품번", f: record.productCode },
    { label: "컬렉션", f: record.collection },
    { label: "색상", f: record.color },
    { label: "사이즈 표기", f: record.sizeOnLabel },
    { label: "당시 가격", f: record.historicPrice },
  ];
  const shownImages = record.images.filter((i) => i.rights === "licensed" || i.rights === "own_capture").length;

  return (
    <section aria-labelledby="editorial-title" className="mt-16 border-t-2 border-ink md:mt-24">
      {/* 표제 */}
      <div className="flex items-center justify-between pt-4">
        <p className="eyebrow text-sub">
          <span className="text-brand">{index}</span> — Archive Editorial
        </p>
        <p className="eyebrow !text-[10px] text-faint">No. {record.verification.recordNo}</p>
      </div>
      <h2 id="editorial-title" className="display mt-8 max-w-[11ch] text-[52px] leading-[0.92] md:mt-12 md:text-[128px]">
        {ed.title ?? record.displayName}
      </h2>
      {ed.subtitle && (
        <p className="mt-5 max-w-[28em] text-[17px] font-bold leading-[1.55] tracking-[-0.02em] md:text-[20px]">{ed.subtitle}</p>
      )}
      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-3 text-[12px]">
        {[
          ["Brand", record.brand],
          ["Collection", factText(record.collection) ?? "미확인"],
          ["Season", factText(record.releaseSeason) ?? factText(record.eraClaim) ?? "미확인"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="font-semibold uppercase tracking-[0.12em] text-faint">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      {/* I. LOOKBOOK */}
      <Chapter no={1} en="The Original Lookbook" ko="출시 당시 컬렉션 화보">
        <div className="-mx-5 md:mx-0">
          <ImageSlot
            image={lookbook}
            source={src(lookbook)}
            registerKey={regKey("lookbook")}
            label={lookbook ? "Lookbook" : "Not Found"}
            emptyNote={ed.lookbook.note}
            tone="dark"
            onOpen={open}
            className="aspect-[4/5] md:aspect-[16/9]"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[11px] tracking-[0.04em] text-sub">
          <span>
            <b className="font-bold text-ink">{ed.lookbook.season ?? "시즌 미확인"}</b> · {ed.lookbook.note}
          </span>
          {lookbook && <span>{RELATION_LABEL[lookbook.relation]}</span>}
        </div>
      </Chapter>

      {/* II. STORY */}
      <Chapter no={2} en="The Story" ko="확인된 역사 자료">
        {ed.story.length ? (
          <ol className="space-y-12 md:space-y-16">
            {ed.story.map((b, i) => (
              <li key={i} className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12">
                <p className="display text-[40px] leading-[0.95] md:text-[64px]">{b.title}</p>
                <div>
                  <p className="text-[18px] font-bold leading-[1.6] tracking-[-0.02em] md:text-[21px]">
                    {b.body}
                    <SourceRefs ids={b.sourceIds} sources={sources} />
                  </p>
                  <p
                    className={cx(
                      "mt-3 inline-flex h-6 items-center px-2 text-[11px] font-bold",
                      b.scope === "brand" ? "bg-paper text-sub" : "border border-ink text-ink",
                    )}
                  >
                    {SCOPE_LABEL[b.scope]}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-l-[3px] border-line pl-4 text-[15px] leading-relaxed text-sub">
            이 제품의 출시 배경을 확인할 수 있는 자료가 아직 없어 이야기를 쓰지 않았습니다.
          </p>
        )}
        {ed.story.some((b) => b.scope === "brand") && (
          <p className="mt-8 border-l-[3px] border-brand pl-4 text-[13px] leading-relaxed">
            위 내용은 유니클로 브랜드의 플리스 역사입니다. 이 옷의 정확한 출시연도나 모델을 증명하지 않습니다.
          </p>
        )}
      </Chapter>

      {/* III. DETAIL */}
      <Chapter no={3} en="Design in Detail" ko="부위별 디테일">
        <ul className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-4 md:gap-x-4">
          {ed.details.map((d, i) => {
            const im = img(d.imageId);
            const hero = i === 0;
            return (
              <li key={d.slot} className={cx(hero && "col-span-2 md:row-span-2")}>
                <ImageSlot
                  image={im}
                  source={src(im)}
                  registerKey={regKey(`detail-${d.slot}`)}
                  label={d.label}
                  emptyNote={d.caption}
                  size={hero ? "lg" : "sm"}
                  onOpen={open}
                  className={hero ? "aspect-[4/5]" : "aspect-square"}
                />
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="display text-[18px] text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13px] font-extrabold">{d.label}</span>
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-sub">{d.caption}</p>
              </li>
            );
          })}
        </ul>
      </Chapter>

      {/* IV. THEN & NOW */}
      <Chapter no={4} en="Then & Now" ko="공식 자료와 지금의 실물">
        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          {(["then", "now"] as const).map((era) => {
            const ids = ed[era];
            return (
              <div key={era} className="border-t border-ink pt-4">
                <p className="display text-[56px] md:text-[96px]">{era === "then" ? "THEN" : "NOW"}</p>
                <p className="mt-1 text-[13px] text-sub">
                  {era === "then" ? "출시 당시 공식 · 언론 자료" : "현재 남아 있는 빈티지 실물"}
                </p>
                {ids.length ? (
                  <ul className="mt-5 grid grid-cols-2 gap-2">
                    {ids.map((id, i) => {
                      const im = img(id);
                      return (
                        <li key={id} className={cx(i === 0 && "col-span-2")}>
                          <ImageSlot
                            image={im}
                            source={src(im)}
                            registerKey={regKey(`${era}-${id}`)}
                            label={im?.label ?? "이미지"}
                            size={i === 0 ? "lg" : "sm"}
                            onOpen={open}
                            className={i === 0 ? "aspect-[4/3]" : "aspect-square"}
                          />
                          {im && (
                            <p className="mt-1.5 text-[11px] leading-snug text-sub">
                              <b className={cx("font-bold", im.relation === "brand_archive" ? "text-faint" : "text-ink")}>
                                {RELATION_LABEL[im.relation]}
                              </b>{" "}
                              · {im.sourceLabel}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="mt-5">
                    <ImageSlot
                      image={null}
                      registerKey={regKey(`${era}-empty`)}
                      label={era === "then" ? "No Archive" : "No Vintage Photo"}
                      emptyNote={era === "then" ? "출시 당시 공식 자료가 확인되지 않았습니다." : "현재 남아 있는 실물 사진이 아직 등록되지 않았습니다."}
                      className="aspect-[4/3]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Chapter>

      {/* V. SOURCES */}
      <Chapter no={5} en="Archive Sources" ko="출처와 확인 상태" id="archive-sources">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div>
            <h4 className="text-[15px] font-extrabold">항목별 확인 여부</h4>
            <dl className="mt-3 divide-y divide-line border-y border-ink">
              {factRows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 py-3">
                  <dt className="w-[76px] shrink-0 text-[12px] text-sub">{r.label}</dt>
                  <dd className={cx("min-w-0 flex-1 text-[13px] font-bold", r.f.value === null && "font-medium text-faint")}>
                    {factText(r.f) ?? "정보 없음"}
                    <SourceRefs ids={r.f.sourceIds ?? []} sources={sources} />
                  </dd>
                  <StatusChip status={r.f.status} />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="w-[76px] shrink-0 text-[12px] text-sub">이미지 권한</dt>
                <dd className="min-w-0 flex-1 text-[13px] font-bold">
                  {shownImages}/{record.images.length}장 공개 가능
                </dd>
                <StatusChip status={shownImages === record.images.length && shownImages > 0 ? "verified" : "unknown"} />
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              확인됨: 공식 · 1차 자료 원문에서 직접 확인 · 표기 · 미확인: 판매처 또는 제3자 표기 · 정보 없음: 확인할 자료가 없음
            </p>
          </div>

          <div>
            <h4 className="text-[15px] font-extrabold">출처</h4>
            <ol className="mt-3 divide-y divide-line border-y border-ink">
              {sources.map((s, i) => (
                <li key={s.id} id={`src-${s.id}`} className="scroll-mt-24 py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="display text-[20px] text-brand">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sub">
                        {s.publisher}
                        {s.date ? ` · ${s.date}` : ""} · {SOURCE_SCOPE_LABEL[s.scope]}
                      </p>
                      <p className="mt-1 text-[14px] font-bold leading-snug">{s.label}</p>
                      <ul className="mt-2 space-y-1">
                        {s.verifies.map((v) => (
                          <li key={v} className="flex gap-2 text-[12px] leading-relaxed text-ink">
                            <span className="mt-[8px] h-px w-2.5 shrink-0 bg-brand" />
                            {v}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[11px] text-faint">
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-0.5 font-bold text-ink hover:underline">
                            원문 보기 <ArrowUpRight size={12} />
                          </a>
                        )}
                        <span>{s.checkedAt ? `${s.checkedAt} 원문 확인` : "원문 미확인"}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <h4 className="mt-8 text-[15px] font-extrabold">이미지 크레디트 · 사용 권한</h4>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {record.images.map((im) => (
                <li key={im.id} className="flex items-start justify-between gap-3 py-2.5 text-[12px]">
                  <span className="min-w-0">
                    <b className="font-bold">{im.label}</b> · {im.sourceLabel}
                    <span className="block text-faint">
                      {RELATION_LABEL[im.relation]}
                      {im.checked ? ` · 링크 응답 ${im.checked.httpStatus ?? "미확인"} (${im.checked.at})` : ""}
                    </span>
                  </span>
                  <span
                    className={cx(
                      "shrink-0 px-1.5 py-0.5 text-[10px] font-bold",
                      im.rights === "unverified" ? "bg-paper text-sub" : "bg-ink text-white",
                    )}
                  >
                    {im.rights === "unverified" ? "권한 미확인 · 비공개" : im.rights === "own_capture" ? "직접 촬영" : "사용 허가"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Chapter>

      <ZoomViewer src={zoom?.src ?? null} alt="아카이브 이미지" caption={zoom?.caption} onClose={close} />
    </section>
  );
}

/** Mock(데모) 제품 — 확인된 출처가 없으므로 에디토리얼을 구성하지 않는다 */
export function EditorialUnavailable({ index = "05" }: { index?: string }) {
  return (
    <section className="mt-16 border-t-2 border-ink pt-4 md:mt-24">
      <p className="eyebrow text-sub">
        <span className="text-brand">{index}</span> — Archive Editorial
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-end">
        <p className="display text-[44px] text-faint md:text-[80px]">NO SOURCES</p>
        <p className="text-[14px] leading-relaxed text-sub">
          이 제품은 프로토타입 시연용 데모 데이터이며 확인된 출처 자료가 없습니다. 출시 화보 · 역사 · 디테일 사진을 지어내지 않기 위해
          에디토리얼을 구성하지 않았습니다. 출처가 확인된 아카이브는 탐색 화면의 ‘SOURCED ARCHIVE’에서 볼 수 있습니다.
        </p>
      </div>
    </section>
  );
}
