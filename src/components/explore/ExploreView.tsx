"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryString } from "@/lib/use-query";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/primitives";
import { CATEGORY_LABEL, cx } from "@/lib/format";
import { RARITY_LABEL } from "@/lib/rarity";
import type { Category, Product, RarityGrade } from "@/types";

type CategoryFilter = Category | "all";
type Decade = "all" | "1990" | "2000" | "2010";
type Sort = "recent" | "rarity" | "priceHigh" | "priceLow";

const CATEGORIES: Category[] = ["outer", "fleece", "knit", "shirt", "tee", "pants"];
const DECADES: { value: Decade; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "1990", label: "1990년대" },
  { value: "2000", label: "2000년대" },
  { value: "2010", label: "2010년대" },
];
const GRADES: RarityGrade[] = ["S", "A", "B", "C"];
const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "최신 등록순" },
  { value: "rarity", label: "희귀도순" },
  { value: "priceHigh", label: "가격 높은순" },
  { value: "priceLow", label: "가격 낮은순" },
];

function Chip({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "h-10 shrink-0 border px-3.5 text-[13px] font-semibold transition-colors",
        active
          ? accent
            ? "border-brand bg-brand text-white"
            : "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

/** URL 쿼리가 바뀌면 key 로 다시 마운트해 초기 필터를 적용한다 */
export function ExploreView({ products }: { products: Product[] }) {
  const search = useQueryString();
  return <ExploreInner key={search} search={search} products={products} />;
}

function ExploreInner({ products, search }: { products: Product[]; search: string }) {
  const params = new URLSearchParams(search);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialCategory = params.get("category");
  const initialRarity = (params.get("rarity") ?? "")
    .split(",")
    .filter((g): g is RarityGrade => GRADES.includes(g as RarityGrade));

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>(
    CATEGORIES.includes(initialCategory as Category) ? (initialCategory as Category) : "all",
  );
  const [collabOnly, setCollabOnly] = useState(params.get("collab") === "1");
  const [decade, setDecade] = useState<Decade>("all");
  const [grades, setGrades] = useState<RarityGrade[]>(initialRarity);
  const [sort, setSort] = useState<Sort>(initialRarity.length ? "rarity" : "recent");
  const [sheet, setSheet] = useState(false);

  const shouldFocus = params.get("focus") === "1";
  useEffect(() => {
    if (shouldFocus) inputRef.current?.focus();
  }, [shouldFocus]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (collabOnly && !p.collab) return false;
      if (decade !== "all") {
        const start = Number(decade);
        if (p.season.year < start || p.season.year >= start + 10) return false;
      }
      if (grades.length && !grades.includes(p.rarity.grade)) return false;
      if (q) {
        const haystack = [
          p.name,
          p.nameKo,
          p.collection,
          p.collab?.partner ?? "",
          p.material,
          p.color.name,
          CATEGORY_LABEL[p.category],
          String(p.season.year),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const priceOf = (p: Product) => (p.market ? p.market.low : null);
    return filtered.sort((a, b) => {
      if (sort === "recent") return b.registeredAt.localeCompare(a.registeredAt);
      if (sort === "rarity") return b.rarity.score - a.rarity.score;
      const pa = priceOf(a);
      const pb = priceOf(b);
      // 가격 정보가 없는 제품은 항상 뒤로 보낸다
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return sort === "priceHigh" ? pb - pa : pa - pb;
    });
  }, [products, query, category, collabOnly, decade, grades, sort]);

  const detailCount = (decade !== "all" ? 1 : 0) + grades.length;
  const anyFilter = detailCount > 0 || category !== "all" || collabOnly || query.trim() !== "";

  const reset = () => {
    setQuery("");
    setCategory("all");
    setCollabOnly(false);
    setDecade("all");
    setGrades([]);
  };

  const toggleGrade = (g: RarityGrade) =>
    setGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const detailFilters = (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-3 text-[13px] font-bold">출시 연도</legend>
        <div className="flex flex-wrap gap-2">
          {DECADES.map((d) => (
            <Chip key={d.value} active={decade === d.value} onClick={() => setDecade(d.value)}>
              {d.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-[13px] font-bold">희귀도 등급</legend>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <Chip key={g} active={grades.includes(g)} onClick={() => toggleGrade(g)} accent>
              {g} · {RARITY_LABEL[g]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-[13px] font-bold">컬렉션</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px]">
          <input
            type="checkbox"
            checked={collabOnly}
            onChange={(e) => setCollabOnly(e.target.checked)}
            className="h-5 w-5 accent-[#E60012]"
          />
          협업 컬렉션만 보기
        </label>
      </fieldset>
    </div>
  );

  return (
    <div className="container-page pt-6 md:pt-10">
      <p className="eyebrow text-brand">Explore</p>
      <h1 className="display mt-2 text-[40px] md:text-[64px]">ARCHIVE</h1>
      <p className="mt-2 text-[14px] text-sub">지금까지 발견된 빈티지 유니클로를 탐색해 보세요.</p>

      {/* 검색 */}
      <div className="relative mt-5">
        <Search size={20} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-ink" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제품명, 컬렉션, 연도로 검색"
          aria-label="제품 검색"
          className="h-[52px] w-full border-b-2 border-ink bg-transparent pl-8 pr-10 text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setQuery("")}
            className="absolute right-[-10px] top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 카테고리 */}
      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
        <Chip active={category === "all" && !collabOnly} onClick={() => { setCategory("all"); setCollabOnly(false); }}>
          전체
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? "all" : c)}>
            {CATEGORY_LABEL[c]}
          </Chip>
        ))}
        <Chip active={collabOnly} onClick={() => setCollabOnly(!collabOnly)} accent>
          협업 컬렉션
        </Chip>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_1fr]">
        {/* 데스크톱 필터 */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 border-t-2 border-ink pt-5">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[15px] font-extrabold">상세 필터</p>
              {anyFilter && (
                <button type="button" onClick={reset} className="flex items-center gap-1 text-[12px] text-sub hover:text-ink">
                  <RotateCcw size={12} /> 초기화
                </button>
              )}
            </div>
            {detailFilters}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between border-y border-line py-1">
            <p className="text-[13px] text-sub">
              <b className="font-extrabold text-ink">{results.length}</b>개의 아카이브
            </p>
            <div className="flex items-center">
              <label className="sr-only" htmlFor="sort">정렬</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-11 bg-transparent pr-1 text-[13px] font-semibold outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSheet(true)}
                className="ml-2 flex h-11 items-center gap-1.5 border-l border-line pl-3 text-[13px] font-semibold lg:hidden"
              >
                <SlidersHorizontal size={16} />
                필터
                {detailCount > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center bg-brand px-1 text-[11px] font-bold text-white">
                    {detailCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {results.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="display text-[32px] text-line">NO RESULT</p>
              <p className="mt-3 text-[15px] font-bold">조건에 맞는 아카이브가 없어요</p>
              <p className="mt-1 text-[13px] text-sub">검색어를 바꾸거나 필터를 초기화해 보세요.</p>
              <Button variant="outline" className="mt-5 !h-11" onClick={reset}>
                <RotateCcw size={15} /> 필터 초기화
              </Button>
            </div>
          )}

          <p className="mt-10 text-[12px] leading-relaxed text-faint">
            표시된 가격은 중고 매물 호가 범위이며 실거래가가 아닙니다. 모든 제품 정보는 데모 데이터입니다.
          </p>
        </div>
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} title="상세 필터" eyebrow="Filter">
        {detailFilters}
        <div className="mt-8 grid grid-cols-[auto_1fr] gap-2">
          <Button variant="outline" onClick={() => { setDecade("all"); setGrades([]); setCollabOnly(false); }}>
            초기화
          </Button>
          <Button variant="dark" onClick={() => setSheet(false)}>
            {results.length}개 결과 보기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
