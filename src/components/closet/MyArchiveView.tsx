"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryString } from "@/lib/use-query";
import {
  Droplets,
  Heart,
  Plus,
  ScanLine,
  Scissors,
  Shirt,
  Tag,
  Trash2,
} from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { ProductCard } from "@/components/product/ProductCard";
import { buttonLinkClass } from "@/components/ui/primitives";
import { cx, dateLabel, seasonLabel, won } from "@/lib/format";
import {
  logActivity,
  removeFromCloset,
  resetDemoData,
  stopSelling,
  useAppState,
} from "@/store/app-store";
import { toast } from "@/store/toast-store";
import type { ActivityType, ClosetEntry, Product } from "@/types";

type Tab = "found" | "owned" | "liked" | "selling" | "log";

const TABS: { key: Tab; label: string }[] = [
  { key: "found", label: "발견" },
  { key: "owned", label: "소유" },
  { key: "liked", label: "찜" },
  { key: "selling", label: "판매 중" },
  { key: "log", label: "기록" },
];

const ACTIVITY_ICON: Record<ActivityType, typeof Tag> = {
  scan: ScanLine,
  save: Plus,
  like: Heart,
  cleaning: Droplets,
  repair: Scissors,
  resale: Tag,
  wear: Shirt,
};

function Empty({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center border border-dashed border-faint px-5 py-14 text-center">
      <p className="display text-[30px] text-line">EMPTY</p>
      <p className="mt-3 text-[15px] font-bold">{title}</p>
      <p className="mt-1 text-[13px] text-sub">{body}</p>
      <Link href={href} className={`${buttonLinkClass.dark} mt-5 !h-11`}>
        {cta}
      </Link>
    </div>
  );
}

export function MyArchiveView({ products }: { products: Product[] }) {
  const search = useQueryString();
  return <MyArchiveInner key={search} search={search} products={products} />;
}

function MyArchiveInner({ products, search }: { products: Product[]; search: string }) {
  const params = new URLSearchParams(search);
  const initial = params.get("tab");
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initial) ? (initial as Tab) : "found");
  const { closet, likes, activities } = useAppState();

  const byId = (id: string) => products.find((p) => p.id === id);
  const collectedIds = new Set(closet.map((e) => e.productId));
  const collected = products.filter((p) => collectedIds.has(p.id));
  const typeCount = new Set(collected.map((p) => p.archiveType.label)).size;

  const found = closet.filter((e) => e.ownership === "found");
  const owned = closet.filter((e) => e.ownership === "owned");
  const selling = closet.filter((e) => e.selling);
  const liked = likes.map(byId).filter((p): p is Product => Boolean(p));

  const counts: Record<Tab, number> = {
    found: found.length,
    owned: owned.length,
    liked: liked.length,
    selling: selling.length,
    log: activities.length,
  };

  const entries = tab === "found" ? found : tab === "owned" ? owned : tab === "selling" ? selling : [];

  const specimen = (entry: ClosetEntry, index: number) => {
    const product = byId(entry.productId);
    if (!product) return null;
    return (
      <li key={entry.id} className="border border-line bg-white">
        <Link href={entry.selling ? `/market/${product.id}` : `/archive/${product.id}`} className="group block">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[11px] font-bold tracking-[0.1em]">
              No. {String(index + 1).padStart(3, "0")}
            </span>
            <span className="text-[11px] font-bold text-brand">
              {entry.ownership === "found" ? "FOUND · 발견" : "OWNED · 소유"}
            </span>
          </div>
          <div className="relative aspect-square bg-paper">
            <GarmentImage spec={product.garment} label={product.nameKo} className="h-full w-full p-[8%] transition-transform duration-300 group-hover:scale-[1.04]" />
            <span className="absolute left-2 top-3 inline-flex h-[22px] min-w-[45%] items-center bg-ink px-1.5 text-[10px] font-bold text-white">
              {product.archiveType.label}
            </span>
            {entry.selling && (
              <span className="absolute bottom-2 left-2 bg-ink px-1.5 py-1 text-[11px] font-bold text-white">
                판매 중{entry.askingPrice ? ` · ₩${won(entry.askingPrice)}` : ""}
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="line-clamp-1 text-[14px] font-bold tracking-[-0.02em]">{product.name}</p>
            <p className="mt-0.5 truncate text-[12px] text-sub">{seasonLabel(product.season)}</p>
            <dl className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-faint">등록일</dt>
                <dd className="font-semibold">{dateLabel(entry.addedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-faint">보존성</dt>
                <dd className="font-semibold">{entry.conditionLabel}</dd>
              </div>
              {entry.place && (
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-faint">발견한 곳</dt>
                  <dd className="truncate font-semibold">{entry.place}</dd>
                </div>
              )}
            </dl>
          </div>
        </Link>
        <div className="flex">
          {entry.selling ? (
            <button
              type="button"
              onClick={() => {
                stopSelling(entry.id);
                toast("판매를 중단했어요");
              }}
              className="h-[52px] flex-1 border border-line text-[15px] hover:bg-paper"
            >
              판매 중단
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                logActivity("wear", product.id, "착용 기록을 남겼어요");
                toast("착용 기록을 남겼어요", { label: "기록 보기", href: "/my?tab=log" });
                setTab("log");
              }}
              className="h-[52px] flex-1 border border-line text-[15px] hover:bg-paper"
            >
              착용 기록 남기기
            </button>
          )}
          <button
            type="button"
            aria-label="옷장에서 삭제"
            onClick={() => {
              removeFromCloset(entry.id);
              toast("옷장에서 삭제했어요");
            }}
            className="flex h-[52px] w-11 items-center justify-center text-sub hover:bg-paper hover:text-brand"
          >
            <Trash2 size={15} strokeWidth={1.6} />
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="container-page pt-6 md:pt-10">
      <p className="eyebrow text-brand">My Archive</p>
      <h1 className="display mt-2 text-[40px] md:text-[64px]">나의 옷장</h1>
      <p className="mt-2 text-[14px] text-sub">내가 발견하고 소유한 유니클로를 모으는 디지털 수집 도감.</p>

      {/* 수집 현황 */}
      <dl className="mt-6 grid grid-cols-3 border-l border-t border-ink">
        {[
          ["수집한 아카이브", `${collected.length}`, `/ ${products.length}종`],
          ["발견한 빈티지 유형", `${typeCount}`, "종"],
          ["사용 기록", `${activities.length}`, "건"],
        ].map(([label, value, unit]) => (
          <div key={label} className="border-b border-r border-ink p-3 md:px-5 md:pb-4 md:pt-7">
            <dt className="text-[11px] text-sub md:text-[13px]">{label}</dt>
            <dd className="mt-1">
              <span className="text-[32px] font-bold leading-none md:text-[48px]">{value}</span>
              <span className="ml-1.5 text-[11px] text-sub md:text-[13px]">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* 탭 */}
      <div role="tablist" aria-label="옷장 분류" className="no-scrollbar sticky top-14 z-20 -mx-5 mt-8 flex overflow-x-auto border-b border-line bg-white px-5 md:top-16 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              "relative flex h-12 shrink-0 items-center gap-1.5 px-3.5 text-[14px] font-bold md:px-5",
              tab === t.key ? "text-ink" : "text-faint",
            )}
          >
            {t.label}
            <span className={cx("text-[12px]", tab === t.key ? "text-brand" : "text-faint")}>{counts[t.key]}</span>
            {tab === t.key && <span className="absolute inset-x-0 bottom-[-1px] h-[3px] bg-brand" />}
          </button>
        ))}
      </div>

      <div className="pt-5" role="tabpanel">
        {(tab === "found" || tab === "owned" || tab === "selling") &&
          (entries.length ? (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {entries.map((e) => specimen(e, closet.length - 1 - closet.indexOf(e)))}
            </ul>
          ) : tab === "selling" ? (
            <Empty title="판매 중인 옷이 없어요" body="아카이브 상세 화면에서 재판매를 등록할 수 있어요." href="/my?tab=owned" cta="소유한 옷 보기" />
          ) : (
            <Empty
              title={tab === "found" ? "아직 발견한 옷이 없어요" : "등록한 옷이 없어요"}
              body={tab === "found" ? "빈티지 숍에서 찾은 유니클로를 스캔해 보세요." : "옷장 속 오래된 유니클로를 스캔해 등록해 보세요."}
              href="/scan"
              cta="스캔하러 가기"
            />
          ))}

        {tab === "liked" &&
          (liked.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
              {liked.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Empty title="찜한 제품이 없어요" body="마음에 드는 아카이브에 하트를 눌러 보세요." href="/explore" cta="아카이브 둘러보기" />
          ))}

        {tab === "log" &&
          (activities.length ? (
            <ol className="border-l border-line pl-5">
              {activities.map((a) => {
                const product = byId(a.productId);
                const Icon = ACTIVITY_ICON[a.type];
                return (
                  <li key={a.id} className="relative pb-6">
                    <span className="absolute -left-[33px] top-0 flex h-6 w-6 items-center justify-center bg-ink text-white">
                      <Icon size={13} />
                    </span>
                    <p className="text-[11px] font-semibold text-faint">{dateLabel(a.at)}</p>
                    <p className="mt-0.5 text-[14px] font-bold">{a.message}</p>
                    {product && (
                      <Link href={`/archive/${product.id}`} className="mt-2 flex items-center gap-3 border border-line p-2 hover:border-ink">
                        <span className="h-12 w-10 shrink-0 bg-paper">
                          <GarmentImage spec={product.garment} className="h-full w-full p-0.5" label={product.nameKo} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-bold">{product.name}</span>
                          <span className="block text-[11px] text-sub">{seasonLabel(product.season)}</span>
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty title="아직 기록이 없어요" body="스캔, 저장, 수선 신청 내역이 여기에 쌓여요." href="/scan" cta="스캔하러 가기" />
          ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-[12px] leading-relaxed text-faint">
          로그인 없이 이 기기의 브라우저에만 저장되는 데모 데이터입니다.
        </p>
        <button
          type="button"
          onClick={() => {
            resetDemoData();
            toast("데모 데이터를 처음 상태로 되돌렸어요");
          }}
          className="h-11 text-[12px] font-semibold text-sub underline underline-offset-4 hover:text-ink"
        >
          데모 데이터 초기화
        </button>
      </div>
    </div>
  );
}
