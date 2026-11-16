"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  ImagePlus,
  Info,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { SaveToClosetModal } from "@/components/closet/SaveToClosetModal";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { Button, DemoTag, RarityBadge, buttonLinkClass } from "@/components/ui/primitives";
import { cx, priceRange, seasonLabel } from "@/lib/format";
import { RARITY_LABEL } from "@/lib/rarity";
import { SCAN_STEPS, analyzeGarment } from "@/services/scan";
import { logActivity, useAppState } from "@/store/app-store";
import { toast } from "@/store/toast-store";
import type { GarmentView, Product, ScanResult, ScanSlotKey } from "@/types";

type Phase = "upload" | "analyzing" | "result";

interface Photo {
  file: File | "sample";
  url: string | null;
}

const SLOTS: { key: ScanSlotKey; label: string; hint: string; required: boolean; view: GarmentView }[] = [
  { key: "front", label: "의류 앞면", hint: "옷 전체가 보이게", required: true, view: "front" },
  { key: "label", label: "케어라벨", hint: "글자가 선명하게", required: true, view: "label" },
  { key: "back", label: "의류 뒷면", hint: "선택", required: false, view: "back" },
  { key: "damage", label: "손상 부위", hint: "선택 · 보풀, 얼룩 등", required: false, view: "detail" },
];

const PHASES: { key: Phase; label: string }[] = [
  { key: "upload", label: "사진 등록" },
  { key: "analyzing", label: "분석" },
  { key: "result", label: "결과" },
];

export function ScanFlow({ products }: { products: Product[] }) {
  const sample = products[0];
  const [phase, setPhase] = useState<Phase>("upload");
  const [photos, setPhotos] = useState<Partial<Record<ScanSlotKey, Photo>>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<string[]>([]);
  const { closet } = useAppState();

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      abortRef.current?.abort();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const setFile = (key: ScanSlotKey, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("이미지 파일만 올릴 수 있어요");
      return;
    }
    const url = URL.createObjectURL(file);
    urlsRef.current.push(url);
    setPhotos((prev) => ({ ...prev, [key]: { file, url } }));
  };

  const removePhoto = (key: ScanSlotKey) =>
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const loadSamples = () => {
    setPhotos({
      front: { file: "sample", url: null },
      label: { file: "sample", url: null },
      back: { file: "sample", url: null },
    });
    toast("샘플 사진을 불러왔어요");
  };

  const ready = Boolean(photos.front && photos.label);

  const start = async () => {
    if (!ready) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStep(0);
    setPhase("analyzing");
    window.scrollTo({ top: 0 });
    try {
      const input = Object.fromEntries(
        Object.entries(photos).map(([k, p]) => [k, p.file]),
      ) as Partial<Record<ScanSlotKey, File | "sample">>;
      const res = await analyzeGarment({ photos: input }, setStep, controller.signal);
      setResult(res);
      setPhase("result");
      logActivity("scan", res.productId, "옷을 스캔해 아카이브와 비교했어요");
    } catch {
      // 분석 도중 취소된 경우
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase("upload");
  };

  const restart = () => {
    setPhotos({});
    setResult(null);
    setStep(0);
    setPhase("upload");
    window.scrollTo({ top: 0 });
  };

  const matched = result ? products.find((p) => p.id === result.productId) ?? sample : sample;
  const phaseIndex = PHASES.findIndex((p) => p.key === phase);
  const progress = Math.round((Math.min(step, SCAN_STEPS.length) / SCAN_STEPS.length) * 100);
  const frontPhoto = photos.front;
  const saved = closet.some((e) => e.productId === matched.id);

  const preview = (photo: Photo | undefined, view: GarmentView, className: string) =>
    photo?.url ? (
      // eslint-disable-next-line @next/next/no-img-element -- 사용자가 방금 고른 로컬 blob 미리보기
      <img src={photo.url} alt="" className={cx("object-cover", className)} />
    ) : (
      <GarmentImage spec={sample.garment} view={view} className={cx(className, (view === "front" || view === "back") && "p-[8%]")} />
    );

  return (
    <div className="container-page max-w-[1000px] pt-6 md:pt-10">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-brand">Scan</p>
        <DemoTag>DEMO · 실제 AI 분석 아님</DemoTag>
      </div>

      {/* 단계 표시 */}
      <ol className="mt-4 grid grid-cols-3 gap-1.5">
        {PHASES.map((p, i) => (
          <li key={p.key}>
            <div className={cx("h-[3px]", i <= phaseIndex ? "bg-brand" : "bg-line")} />
            <p className={cx("mt-2 text-[12px] font-bold", i <= phaseIndex ? "text-ink" : "text-faint")}>
              <span className="mr-1 text-brand">{i + 1}</span>
              {p.label}
            </p>
          </li>
        ))}
      </ol>

      {/* STEP 1 */}
      {phase === "upload" && (
        <section className="animate-page pt-8">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] md:text-[40px]">
            발견한 옷을
            <br />
            촬영해 주세요
          </h1>
          <p className="mt-2 text-[14px] text-sub">앞면과 케어라벨 사진은 꼭 필요해요. 나머지는 있으면 더 정확해집니다.</p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {SLOTS.map((slot) => {
              const photo = photos[slot.key];
              return (
                <div key={slot.key}>
                  <div className={cx("relative aspect-[4/5] overflow-hidden", photo ? "bg-paper" : "border border-dashed border-faint bg-ivory")}>
                    {photo ? (
                      <>
                        {preview(photo, slot.view, "h-full w-full")}
                        <span className="absolute left-2 top-2 flex h-6 items-center gap-1 bg-ink px-1.5 text-[11px] font-bold text-white">
                          <Check size={12} /> {photo.file === "sample" ? "샘플" : "등록됨"}
                        </span>
                        <button
                          type="button"
                          aria-label={`${slot.label} 사진 삭제`}
                          onClick={() => removePhoto(slot.key)}
                          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center"
                        >
                          <span className="flex h-7 w-7 items-center justify-center bg-white">
                            <X size={16} />
                          </span>
                        </button>
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-sub hover:text-ink">
                        <ImagePlus size={28} strokeWidth={1.4} />
                        <span className="text-[12px] font-semibold">촬영 / 앨범에서 선택</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            setFile(slot.key, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[14px] font-bold">
                      {slot.label}
                      {slot.required && <span className="ml-0.5 text-brand">*</span>}
                    </p>
                    {!photo && (
                      <label className="flex h-9 cursor-pointer items-center gap-1 px-1 text-[12px] font-semibold text-sub hover:text-ink">
                        <Camera size={14} /> 카메라
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) => {
                            setFile(slot.key, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[12px] text-sub">{slot.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-start gap-2.5 bg-paper p-4 text-[13px] leading-relaxed">
            <Info size={16} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-bold">촬영 가이드</p>
              <p className="mt-0.5 text-sub">
                밝은 곳에서 옷을 평평하게 펼쳐 찍어 주세요. 케어라벨은 옆구리 안쪽 봉제선에 있는 경우가 많습니다.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 md:flex-row-reverse">
            <Button className="w-full md:flex-1" disabled={!ready} onClick={start}>
              <Sparkles size={18} />
              아카이브 분석 시작
            </Button>
            <Button variant="outline" className="w-full md:w-auto" onClick={loadSamples}>
              샘플 사진으로 체험하기
            </Button>
          </div>
          {!ready && (
            <p className="mt-2 text-center text-[12px] text-sub md:text-right">
              앞면과 케어라벨 사진을 등록하면 분석을 시작할 수 있어요.
            </p>
          )}
        </section>
      )}

      {/* STEP 2 */}
      {phase === "analyzing" && (
        <section className="animate-page pt-8">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden bg-paper">
              {preview(frontPhoto, "front", "h-full w-full")}
              <div className="absolute inset-x-0 h-[2px] animate-scan bg-brand shadow-[0_0_18px_4px_rgba(230,0,18,0.45)]" />
              {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"].map((c) => (
                <span key={c} className={cx("absolute h-6 w-6 border-white", c)} />
              ))}
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-ink px-2 py-1 text-[11px] font-bold text-white">
                DEMO SCAN
              </span>
            </div>

            <div>
              <p className="display text-[64px] md:text-[88px]">
                {progress}
                <span className="text-[28px] text-brand">%</span>
              </p>
              <div className="mt-2 h-1 bg-line">
                <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
              <h1 className="mt-5 text-[20px] font-extrabold tracking-[-0.02em]">
                {SCAN_STEPS[Math.min(step, SCAN_STEPS.length - 1)].label}
              </h1>

              <ul className="mt-4 divide-y divide-line border-y border-line" aria-live="polite">
                {SCAN_STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li key={s.key} className={cx("flex h-12 items-center gap-3 text-[14px]", done ? "text-ink" : active ? "font-bold text-ink" : "text-faint")}>
                      <span className={cx("flex h-6 w-6 items-center justify-center", done ? "bg-brand text-white" : active ? "text-brand" : "border border-line")}>
                        {done ? <Check size={14} strokeWidth={3} /> : active ? <LoaderCircle size={18} className="animate-spin" /> : null}
                      </span>
                      {done ? s.doneLabel : s.label}
                      {done && <span className="ml-auto text-[12px] text-faint">완료</span>}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-[12px] leading-relaxed text-sub">
                프로토타입에서는 실제 이미지 분석을 하지 않고, 준비된 샘플 결과를 보여 드립니다.
              </p>
              <Button variant="outline" className="mt-4 !h-11 w-full md:w-auto" onClick={cancel}>
                취소
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3 */}
      {phase === "result" && result && (
        <section className="animate-page pt-8">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center bg-brand text-white">
              <Check size={14} strokeWidth={3} />
            </span>
            <p className="text-[14px] font-bold">아카이브에서 일치하는 제품을 찾았어요</p>
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-2 md:gap-12">
            <div>
              <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                {preview(frontPhoto, "front", "h-full w-full")}
                <span className="absolute left-3 top-3">
                  <RarityBadge grade={matched.rarity.grade} size="md" />
                </span>
                {frontPhoto?.url && (
                  <span className="absolute bottom-3 right-3 h-[92px] w-[74px] border-2 border-white bg-paper">
                    <GarmentImage spec={matched.garment} className="h-full w-full p-1" label="매칭된 아카이브" />
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-faint">
                {frontPhoto?.url ? "내가 올린 사진 · 오른쪽 아래는 매칭된 아카이브" : "샘플 이미지"}
              </p>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow text-sub">Archive Card</p>
                <DemoTag>DEMO 결과 · 공식 인증 아님</DemoTag>
              </div>
              <h1 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[38px]">{matched.name}</h1>
              <p className="mt-1 text-[15px] text-sub">{matched.nameKo}</p>

              <dl className="mt-5 divide-y divide-line border-y border-ink text-[14px]">
                {[
                  ["출시 연도 · 시즌", seasonLabel(matched.season)],
                  ["협업 컬렉션", matched.collab ? matched.collab.note : "해당 없음"],
                  ["소재 · 색상", `${matched.material} · ${matched.color.name}`],
                  ["아카이브 일치도", `${Math.round(result.confidence * 100)}% (데모 값)`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-3.5">
                    <dt className="shrink-0 text-sub">{k}</dt>
                    <dd className="text-right font-bold">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
                <div className="bg-white p-4">
                  <p className="text-[12px] text-sub">희귀도 등급</p>
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span className="display text-[40px] text-brand">{matched.rarity.grade}</span>
                    <span className="text-[13px] font-bold">{RARITY_LABEL[matched.rarity.grade]}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-faint">희소성 지표 {matched.rarity.score} / 100</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[12px] text-sub">이 옷의 외관 상태</p>
                  <p className="mt-1 text-[24px] font-extrabold leading-[40px]">{result.condition.label}</p>
                  <p className="mt-1 text-[11px] text-faint">등급과 별도로 평가</p>
                </div>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {result.condition.notes.map((n) => (
                  <li key={n} className="bg-paper px-2.5 py-1.5 text-[12px] font-medium">{n}</li>
                ))}
              </ul>

              <div className="mt-4 border-y border-line py-4">
                <p className="text-[12px] text-sub">예상 중고 매물 가격대 (호가 기준)</p>
                <p className="mt-0.5 text-[24px] font-extrabold tracking-[-0.03em]">{priceRange(matched.market)}</p>
                {matched.market && (
                  <p className="text-[12px] text-faint">
                    매물 {matched.market.listings}건 · {matched.market.asOf} 기준 · 실거래가 아님
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <Link href={`/archive/${matched.id}`} className={buttonLinkClass.dark}>
                  아카이브 자세히 보기 <ArrowRight size={18} />
                </Link>
                {saved ? (
                  <Link href="/my" className={buttonLinkClass.outline}>
                    <Check size={18} className="text-brand" /> 옷장에 저장됨 · 보러 가기
                  </Link>
                ) : (
                  <Button onClick={() => setSaveOpen(true)}>
                    <Plus size={18} /> 나의 옷장에 저장
                  </Button>
                )}
                <button type="button" onClick={restart} className="mx-auto flex h-11 items-center gap-1.5 text-[13px] font-semibold text-sub hover:text-ink">
                  <RotateCcw size={14} /> 다른 옷 스캔하기
                </button>
              </div>
            </div>
          </div>

          <SaveToClosetModal
            open={saveOpen}
            onClose={() => setSaveOpen(false)}
            product={matched}
            conditionLabel={result.condition.label}
          />
        </section>
      )}
    </div>
  );
}
