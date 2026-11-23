"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  ChevronRight,
  Hash,
  Info,
  Layers,
  Palette,
  Ruler,
  Share2,
  Shirt,
  Sparkles,
  Tag,
  WashingMachine,
} from "lucide-react";
import { ArchiveEditorial } from "@/components/archive/editorial/ArchiveEditorial";
import { SectionTitle } from "@/components/archive/SectionTitle";
import { CertificateLauncher } from "@/components/certificate/CertificateLauncher";
import { RarityBadge } from "@/components/ui/primitives";
import { ZoomViewer } from "@/components/ui/ZoomViewer";
import { cx, won } from "@/lib/format";
import { BASIS_LABEL, VERIFICATION_LEVEL_LABEL } from "@/lib/archive/record-rules";
import { recordToCertificate } from "@/lib/archive/record-certificate";
import { toast } from "@/store/toast-store";
import type { ArchiveRecord, ConditionStatus, Fact, PriceStats, RecordImage } from "@/types/archive-record";
import { StatusChip, basisText, factText } from "./FactChip";
import { RecordGallery } from "./RecordGallery";

const CONDITION_LABEL: Record<ConditionStatus, string> = {
  suspected: "의심",
  not_observed: "사진상 발견되지 않음",
  unknown: "확인되지 않음",
  not_applicable: "해당 없음",
};

function money(n: number, currency: string) {
  return currency === "KRW" ? `₩${won(n)}` : `${currency} ${n.toLocaleString()}`;
}

async function share(title: string) {
  try {
    if (navigator.share) return void (await navigator.share({ title: `${title} | RE:FOUND`, url: location.href }));
    await navigator.clipboard.writeText(location.href);
    toast("링크를 복사했어요");
  } catch {
    // 공유 취소
  }
}

export function VerificationLevelBadge({ level }: { level: ArchiveRecord["verification"]["level"] }) {
  const meta = VERIFICATION_LEVEL_LABEL[level];
  return (
    <span className="inline-flex h-6 items-stretch overflow-hidden bg-white text-[11px] font-bold shadow-[0_0_0_1px_rgba(17,17,17,0.12)]">
      <span
        className={cx(
          "flex w-6 items-center justify-center",
          level === "verified" ? "bg-brand text-white" : level === "none" ? "bg-paper text-faint" : "bg-ink text-white",
        )}
      >
        {level === "verified" ? <Check size={13} strokeWidth={3} /> : level === "none" ? "–" : <Sparkles size={12} />}
      </span>
      <span className="flex items-center px-2">{meta.label}</span>
    </span>
  );
}

function Spec({ icon: Icon, label, f, accent }: { icon: typeof Calendar; label: string; f: Fact<unknown>; accent?: boolean }) {
  const text = factText(f);
  return (
    <div className="border-b border-r border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <Icon size={20} strokeWidth={1.6} className={accent ? "text-brand" : "text-ink"} />
        <StatusChip status={f.status} />
      </div>
      <dt className="mt-3 text-[12px] text-sub">{label}</dt>
      <dd className={cx("mt-0.5 text-[14px] font-bold leading-snug", text === null && "font-medium text-faint")}>{text ?? "정보 없음"}</dd>
      <p className="mt-1 text-[11px] leading-snug text-faint">{basisText(f)}</p>
    </div>
  );
}

function Stats({ title, s, currency, tone }: { title: string; s: PriceStats | null; currency: string; tone: "ask" | "sold" }) {
  return (
    <div className="border-b border-r border-line p-4">
      <dt className="flex items-center justify-between text-[12px] text-sub">
        {title}
        <span className={cx("px-1.5 py-0.5 text-[10px] font-bold", tone === "sold" ? "bg-ink text-white" : "border border-ink")}>
          {tone === "sold" ? "실거래" : "호가"}
        </span>
      </dt>
      {s ? (
        <dd className="mt-1">
          <p className="text-[20px] font-extrabold tracking-[-0.03em]">
            {money(s.low, currency)} – {won(s.high)}
          </p>
          <p className="text-[12px] text-sub">
            중간값 {money(s.median, currency)} · {s.count}건
          </p>
        </dd>
      ) : (
        <dd className="mt-1 text-[14px] font-medium text-faint">데이터 없음</dd>
      )}
    </div>
  );
}

export function RecordDetail({ record, related = [] }: { record: ArchiveRecord; related?: ArchiveRecord[] }) {
  const certificate = recordToCertificate(record);
  const { market, rarity, verification: v } = record;
  const year = record.releaseYear.status === "verified" ? record.releaseYear.value : null;
  const [zoom, setZoom] = useState<{ src: string; caption: string } | null>(null);
  const closeZoom = useCallback(() => setZoom(null), []);
  const evidence = (ids: string[]) => ids.map((id) => record.images.find((i) => i.id === id)).filter((i): i is RecordImage => Boolean(i));

  return (
    <article>
      <div className="container-page">
        <nav aria-label="경로" className="flex h-11 items-center gap-1 text-[12px] text-sub">
          <Link href="/explore" className="hover:text-ink">아카이브</Link>
          <ChevronRight size={12} />
          <span>{record.kind === "scan" ? "내 스캔" : "Sourced Archive"}</span>
          <ChevronRight size={12} />
          <span className="truncate text-ink">{record.displayName}</span>
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <div className="-mx-5 md:mx-0">
            <div className="md:sticky md:top-24">
              {/* 갤러리는 레코드 종류와 관계없이 같은 컴포넌트 — 실제 촬영 사진이 있으면 앞면이 대표 이미지 */}
              <RecordGallery record={record} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {record.collection.value && (
                <span className="inline-flex h-6 items-center bg-ink px-2 text-[11px] font-bold tracking-wide text-white">{record.collection.value}</span>
              )}
              <a href="#verification" aria-label="검증 단계로 이동">
                <VerificationLevelBadge level={v.level} />
              </a>
              <span className="inline-flex h-6 items-center border border-ink px-1.5 text-[10px] font-bold tracking-[0.12em]">
                {record.kind === "scan" ? "MY SCAN · 실제 촬영" : "SOURCED · 출처 확인 자료"}
              </span>
            </div>

            {year ? (
              <p className="display mt-5 text-[64px] text-brand md:text-[88px]">&apos;{String(year).slice(2)}</p>
            ) : (
              <div className="mt-5">
                <p className="display text-[56px] text-faint md:text-[80px]">UNDATED</p>
                <p className="mt-1 text-[12px] text-sub">
                  {record.eraClaim.value ? `연대 표기 ${record.eraClaim.value} · ${BASIS_LABEL[record.eraClaim.basis]} · 공식 확인 안 됨` : "출시연도 미확인"}
                </p>
              </div>
            )}
            <h1 className="mt-1 text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[40px]">{record.displayName}</h1>
            <p className="mt-1.5 text-[16px] font-medium text-sub">
              {record.displayNameKo ?? record.brand} · {record.releaseSeason.value ?? "시즌 미확인"}
            </p>

            <ul className="mt-4 space-y-2">
              {record.description.map((d) => (
                <li key={d.text} className="text-[15px] leading-[1.75]">
                  {d.text}{" "}
                  <span className={cx("ml-0.5 inline-flex h-[18px] items-center px-1 align-[2px] text-[10px] font-bold", d.basis === "ai_observation" ? "bg-ink text-white" : d.basis === "none" ? "bg-paper text-faint" : "border border-ink")}>
                    {BASIS_LABEL[d.basis]}
                  </span>
                </li>
              ))}
            </ul>

            {/* 빈티지 유형 */}
            {record.vintageType ? (
              <div className="mt-6 border-l-[3px] border-brand bg-brand-tint p-4 md:p-5">
                <p className="eyebrow !text-[10px] text-brand">빈티지 유형 · Archive Type</p>
                <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.03em] text-brand">
                  {record.vintageType.label}
                  <span className="ml-2 text-[13px] font-semibold text-brand/70">{record.vintageType.en}</span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{record.vintageType.reason}</p>
              </div>
            ) : (
              <div className="mt-6 border-l-[3px] border-line bg-paper p-4 md:p-5">
                <p className="eyebrow !text-[10px] text-sub">빈티지 유형 · Archive Type</p>
                <p className="mt-1.5 text-[20px] font-extrabold tracking-[-0.03em] text-faint">판정 자료 부족</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-sub">{record.vintageTypeNote}</p>
              </div>
            )}

            <a href="#market" className="mt-5 flex items-end justify-between border-y border-line py-4">
              <div>
                <p className="text-[12px] text-sub">중고시장 가격</p>
                <p className="mt-0.5 text-[24px] font-extrabold tracking-[-0.03em]">
                  {market?.asking ? (
                    `${money(market.asking.low, market.currency)} – ${won(market.asking.high)}`
                  ) : market?.sold ? (
                    `${money(market.sold.low, market.currency)} – ${won(market.sold.high)}`
                  ) : (
                    <span className="text-faint">시세 데이터 준비 중</span>
                  )}
                </p>
              </div>
              <span className="flex items-center gap-0.5 text-[12px] text-sub">
                {market ? `매물 ${(market.asking?.count ?? 0) + (market.sold?.count ?? 0)}건` : "연결된 데이터 없음"} <ChevronRight size={14} />
              </span>
            </a>

            <div className="mt-5 flex gap-2">
              <a href="#archive-sources" className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 bg-ink px-5 text-[15px] font-bold text-white hover:bg-black">
                출처 · 확인 상태 보기
              </a>
              <button type="button" aria-label="공유" onClick={() => share(record.displayName)} className="flex h-[52px] w-[52px] items-center justify-center border border-line">
                <Share2 size={20} strokeWidth={1.8} />
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3">
              <Spec icon={Calendar} label="출시연도" f={record.releaseYear} accent />
              <Spec icon={Calendar} label="출시 시즌" f={record.releaseSeason} />
              <Spec icon={Shirt} label="제품 유형" f={record.category} />
              <Spec icon={Layers} label="소재" f={record.material} />
              <Spec icon={Ruler} label="핏" f={record.fit} />
              <Spec icon={Palette} label="색상" f={record.color} />
              <Spec icon={Sparkles} label="디자인 특징" f={record.designFeatures} />
              <Spec icon={Hash} label="품번" f={record.productCode} />
              <Spec icon={Tag} label="사이즈 표기" f={record.sizeOnLabel} />
              {record.washing.value && <Spec icon={WashingMachine} label="세탁 정보" f={record.washing} />}
            </dl>
            <p className="mt-2 text-[12px] leading-relaxed text-faint">
              확인됨: 공식 자료 · 상품 DB 원문 확인 / 표기 · 미확인: 판매처 · 제3자 표기 / AI 관찰: Gemini가 사진에서 본 내용(확정 아님) / 정보 없음: 근거 없음
            </p>
          </div>
        </div>

        {/* 01 검증 단계 */}
        <section id="verification" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle
            index="01"
            en="Verification"
            title="검증 단계"
            note="AI 분석 완료 · 아카이브 정보 확인 · 검증 완료는 서로 다른 단계입니다. AI 이미지 분석만으로는 정품 인증이 되지 않습니다."
          />
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14">
            <ol className="border-y border-ink">
              {v.stages.map((s, i) => (
                <li key={s.key} className="flex gap-4 border-b border-line py-4 last:border-b-0">
                  <span
                    className={cx(
                      "flex size-8 shrink-0 items-center justify-center text-[13px] font-extrabold",
                      s.done ? (s.key === "verified" ? "bg-brand text-white" : "bg-ink text-white") : "border border-line text-faint",
                    )}
                  >
                    {s.done ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={cx("text-[15px] font-extrabold", !s.done && "text-faint")}>{s.label}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-sub">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div>
              {certificate ? (
                <CertificateLauncher certificate={certificate} />
              ) : (
                <div className="border border-line bg-paper px-5 py-10 text-center">
                  <p className="display text-[30px] text-faint">NOT VERIFIED</p>
                  <p className="mt-3 text-[14px] font-bold">검증 단계 기록이 없습니다</p>
                  <Link href="/scan" className="mt-3 inline-flex h-11 items-center gap-1 text-[13px] font-bold text-brand">
                    이 옷을 직접 촬영해 분석하기 <ChevronRight size={14} />
                  </Link>
                </div>
              )}
              <p className="mt-3 text-[12px] leading-relaxed text-sub">
                기록 번호 <b className="text-ink">{v.recordNo}</b> · {v.note}
              </p>
              {record.match && (
                <div className="mt-6 border border-line p-4">
                  <p className="text-[14px] font-extrabold">상품 DB 대조</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-sub">{record.match.note}</p>
                  {record.match.crossChecks.length > 0 && (
                    <ul className="mt-3 divide-y divide-line border-t border-line">
                      {record.match.crossChecks.map((c) => (
                        <li key={c.field} className="flex items-baseline justify-between gap-3 py-2 text-[12px]">
                          <span className="w-14 shrink-0 font-bold">{c.field}</span>
                          <span className="min-w-0 flex-1 text-sub">
                            DB {c.db ?? "—"} · 사진 {c.observed ?? "—"}
                          </span>
                          <span className={cx("shrink-0 font-bold", c.result === "mismatch" ? "text-brand" : c.result === "unknown" ? "text-faint" : "")}>
                            {c.result === "match" ? "일치" : c.result === "mismatch" ? "불일치" : "판단 불가"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 02 상태 · 희귀도 */}
        <section id="evaluation" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle
            index="02"
            en="Condition & Rarity"
            title="외관 상태와 희귀도"
            note="외관 상태는 AI가 사진에서 '의심'되는 부분을 표시한 것이며 손상을 확정하지 않습니다. 희귀도는 실제 자료가 있는 항목만으로 계산합니다."
          />
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="border border-line p-4 md:p-5">
              <h3 className="text-[17px] font-extrabold">외관 상태</h3>
              {record.condition ? (
                <>
                  <ul className="mt-3 divide-y divide-line border-y border-line">
                    {record.condition.map((c) => {
                      const ev = evidence(c.evidenceImageIds);
                      return (
                        <li key={c.key} className="py-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[14px] font-bold">{c.label}</span>
                            <span className={cx("text-[13px] font-bold", c.status === "suspected" ? "text-brand" : c.status === "unknown" ? "text-faint" : "")}>
                              {CONDITION_LABEL[c.status]}
                            </span>
                          </div>
                          {(c.locations.length > 0 || c.note) && (
                            <p className="mt-1 text-[12px] leading-relaxed text-sub">
                              {c.locations.length > 0 && `위치: ${c.locations.join(", ")}`}
                              {c.locations.length > 0 && c.note ? " · " : ""}
                              {c.note}
                            </p>
                          )}
                          {ev.length > 0 && (
                            <div className="mt-2 flex gap-1.5">
                              {ev.map((im) =>
                                im.src ? (
                                  <button key={im.id} type="button" onClick={() => setZoom({ src: im.src as string, caption: `근거 사진 · ${im.label} · ${im.caption ?? ""}` })} title={im.label} aria-label={`근거 사진 ${im.label} 확대`} className="block size-12 overflow-hidden bg-paper">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- 근거 촬영 사진 */}
                                    <img src={im.src} alt={`근거 사진 · ${im.label}`} className="h-full w-full object-cover" />
                                  </button>
                                ) : (
                                  <span key={im.id} className="flex h-12 items-center bg-paper px-2 text-[10px] text-sub">{im.label}</span>
                                ),
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {record.additionalChecks.length > 0 && (
                    <div className="mt-4 bg-paper p-3">
                      <p className="text-[12px] font-bold">추가 확인 필요</p>
                      <ul className="mt-1 space-y-1 text-[12px] text-sub">
                        {record.additionalChecks.map((a) => (
                          <li key={a.target}>
                            · {a.target} — {a.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-sub">
                  이 레코드에는 실물 상태를 확인한 기록이 없습니다. 판매처의 상태 표기는 검수 결과로 옮기지 않았습니다.
                </p>
              )}
            </div>

            <div className="border border-ink">
              <div className="flex items-stretch">
                <div className={cx("flex w-[104px] shrink-0 flex-col items-center justify-center py-5 md:w-[128px]", rarity.grade ? "bg-brand text-white" : "bg-paper text-faint")}>
                  <span className="text-[11px] font-semibold tracking-[0.14em]">RARITY</span>
                  <span className="display text-[64px] md:text-[80px]">{rarity.grade ?? "—"}</span>
                </div>
                <div className="flex flex-1 flex-col justify-center p-4 md:p-5">
                  <h3 className="text-[17px] font-extrabold">{rarity.grade ? "희귀도 등급" : "판정 자료 부족"}</h3>
                  {rarity.grade && <RarityBadge grade={rarity.grade} withLabel />}
                  <p className="mt-1 text-[12px] leading-relaxed text-sub">{rarity.note}</p>
                </div>
              </div>
              <ul className="divide-y divide-line border-t border-ink">
                {rarity.factors.map((f) => (
                  <li key={f.key} className="flex items-baseline justify-between gap-3 px-4 py-3 md:px-5">
                    <span className={cx("text-[13px] font-bold", !f.available && "text-faint")}>{f.label}</span>
                    <span className={cx("text-right text-[12px]", f.available ? "text-ink" : "text-faint")}>
                      {f.available ? `${f.value} · ${f.points}/${f.max}` : "자료 없음 · 계산 제외"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 03 시장 */}
        <section id="market" className="mt-16 scroll-mt-24 md:mt-24">
          <SectionTitle index="03" en="Market Value" title="중고시장 가격" />
          {market ? (
            <div>
              <dl className="grid border-l border-t border-line sm:grid-cols-2">
                <Stats title="판매 희망가" s={market.asking} currency={market.currency} tone="ask" />
                <Stats title="실거래가" s={market.sold} currency={market.currency} tone="sold" />
                <div className="border-b border-r border-line p-4">
                  <dt className="text-[12px] text-sub">데이터 출처</dt>
                  <dd className="mt-1 text-[14px] font-bold">{market.sources.join(", ")}</dd>
                </div>
                <div className="border-b border-r border-line p-4">
                  <dt className="text-[12px] text-sub">수집일</dt>
                  <dd className="mt-1 text-[14px] font-bold">
                    {market.collectedFrom === market.collectedTo ? market.collectedFrom : `${market.collectedFrom} – ${market.collectedTo}`}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-sub">
                <Info size={14} className="mt-0.5 shrink-0 text-brand" />
                판매 희망가(호가)는 판매자가 올린 가격이며 실제 거래가가 아닙니다. 두 값은 따로 집계합니다.
              </p>
            </div>
          ) : (
            <div className="border border-line bg-paper px-5 py-12 text-center">
              <p className="display text-[30px] text-faint">NO MARKET DATA</p>
              <p className="mt-3 text-[15px] font-bold">시세 데이터 준비 중</p>
              <p className="mx-auto mt-1 max-w-[32em] text-[13px] leading-relaxed text-sub">
                이 제품에 연결된 실제 중고 매물 데이터가 없어 가격을 표시하지 않습니다. 예시 가격으로 대신 채우지 않습니다.
              </p>
            </div>
          )}
        </section>

        {/* 05 에디토리얼 (04는 데모 상세의 아카이브 스토리 자리 — 실제 레코드는 THE STORY가 대신한다) */}
        <ArchiveEditorial record={record} index="04" />

        {related.length > 0 && (
          <section className="mt-16 md:mt-24">
            <div className="mb-5 border-t-2 border-ink pt-4">
              <p className="eyebrow text-brand">Sourced Archive</p>
              <h2 className="mt-2 text-[22px] font-extrabold tracking-[-0.03em] md:text-[28px]">출처가 확인된 다른 아카이브</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
              {related.map((r) => (
                <RecordCard key={r.id} record={r} />
              ))}
            </div>
          </section>
        )}
      </div>
      <ZoomViewer src={zoom?.src ?? null} alt="근거 사진" caption={zoom?.caption} onClose={closeZoom} />
    </article>
  );
}

/** 탐색 · 관련 목록용 카드 — 공개 가능한 사진이 없으면 타이포 카드로 그린다 */
export function RecordCard({ record }: { record: ArchiveRecord }) {
  const hero = record.images.find((i) => i.src && i.relation !== "brand_archive");
  const year = record.releaseYear.status === "verified" ? record.releaseYear.value : null;
  return (
    <Link href={record.href} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-ivory ring-1 ring-inset ring-line">
        {hero?.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- 권한 확인 이미지
          <img src={hero.src} alt={record.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-between p-3 md:p-4">
            <p className={cx("display text-[44px] md:text-[56px]", year ? "text-brand" : "text-faint")}>
              {year ? `'${String(year).slice(2)}` : "N/D"}
            </p>
            <div>
              <p className="display text-[20px] leading-[1] md:text-[26px]">{record.editorial.title ?? record.displayName}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Image rights pending</p>
            </div>
          </div>
        )}
        <span className="absolute left-2 top-2">
          <VerificationLevelBadge level={record.verification.level} />
        </span>
      </div>
      <p className="mt-2 text-[11px] font-bold tracking-wide text-sub">{record.collection.value ?? record.brand}</p>
      <p className="mt-0.5 line-clamp-2 text-[14px] font-bold leading-snug group-hover:underline">{record.displayName}</p>
      <p className="mt-0.5 text-[12px] text-sub">{record.releaseSeason.value ?? record.eraClaim.value ?? "시즌 미확인"}{record.eraClaim.value && !record.releaseSeason.value ? " · 표기" : ""}</p>
    </Link>
  );
}
