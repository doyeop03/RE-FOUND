import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { Logo } from "@/components/ui/primitives";
import { cx, seasonLabel, shortYear } from "@/lib/format";
import { RARITY_LABEL } from "@/lib/rarity";
import {
  barcodeBars,
  CHECK_RESULT_LABEL,
  checkProgress,
  VERIFICATION_STATUS,
} from "@/lib/verification";
import type { CheckResult, Product, Verification, VerificationStatus } from "@/types";

/* ───────── 내부 조각 ───────── */

/** 상태 밴드 — 카드 상단에서 상태를 가장 먼저, 크게 알려 준다 */
function StatusBand({ v }: { v: Verification }) {
  const meta = VERIFICATION_STATUS[v.status];
  const { done, total, flagged } = checkProgress(v);

  const tone: Record<VerificationStatus, string> = {
    verified: "bg-brand text-white",
    in_review: "bg-ink text-white",
    needs_review: "bg-white text-brand border-b border-brand",
  };

  return (
    <div className={cx("relative px-5 pb-4 pt-5", tone[v.status])}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cx(
              "eyebrow !text-[10px]",
              v.status === "needs_review" ? "text-brand/70" : "text-white/70",
            )}
          >
            Archive Verification
          </p>
          <p className="display mt-1.5 text-[34px] leading-none">{meta.en}</p>
        </div>
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            v.status === "verified" && "bg-white text-brand",
            v.status === "in_review" && "border border-white/40",
            v.status === "needs_review" && "border-[1.5px] border-brand text-[20px] font-black",
          )}
          aria-hidden
        >
          {v.status === "verified" && <Check size={22} strokeWidth={3} />}
          {v.status === "in_review" && <Clock3 size={20} strokeWidth={2} />}
          {v.status === "needs_review" && "!"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[13px] font-semibold">
        <span>{meta.label}</span>
        <span className={cx("text-[12px] font-medium", v.status === "needs_review" ? "text-ink" : "text-white/80")}>
          {v.status === "verified" && `${total}개 항목 모두 통과`}
          {v.status === "in_review" && `${done} / ${total} 항목 검수 완료`}
          {v.status === "needs_review" && `${flagged}개 항목 확인 필요`}
        </span>
      </div>

      {/* 진행률 — 진행 중일 때만 */}
      {v.status === "in_review" && (
        <div className="mt-3 grid grid-cols-5 gap-1" aria-hidden>
          {v.checks.map((c) => (
            <span key={c.key} className={cx("h-[3px]", c.result === "pending" ? "bg-white/20" : "bg-white")} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultMark({ result }: { result: CheckResult }) {
  if (result === "pass") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center bg-ink text-white">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  }
  if (result === "flag") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center bg-brand text-[12px] font-black text-white">
        !
      </span>
    );
  }
  return <span className="size-5 shrink-0 border border-dashed border-faint" />;
}

/** 장식용 바코드 (실제 스캔용 아님) */
function Barcode({ code }: { code: string }) {
  return (
    <span className="flex h-8 shrink-0 items-stretch gap-px" aria-hidden>
      {barcodeBars(code).map((w, i) => (
        <span key={i} className={i % 2 === 0 ? "bg-ink" : "bg-transparent"} style={{ width: w }} />
      ))}
    </span>
  );
}

function Field({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 border-b border-r border-line px-3.5 py-3">
      <dt className="text-[11px] text-sub">{label}</dt>
      <dd
        className={cx(
          "mt-0.5 text-[14px] font-bold leading-snug",
          accent && "text-brand",
          muted && "font-semibold text-faint",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* ───────── 메인 카드 ───────── */

export interface VerificationCardProps {
  product: Product;
  verification: Verification;
  /**
   * 하단 버튼. 기본은 상품 상세보기.
   * 상세 페이지 안에서 쓸 때는 다른 앵커로 바꾸거나 null로 숨긴다.
   */
  action?: { href: string; label: string } | null;
  className?: string;
}

/**
 * 아카이브 인증 카드.
 * 서버 컴포넌트로 동작하며, 제품 상세 · 스캔 결과 · 나의 옷장 인증서 목록에서 재사용한다.
 */
export function VerificationCard({ product, verification: v, action, className }: VerificationCardProps) {
  const { rarity } = product;
  const { passed, total } = checkProgress(v);
  const cta = action === undefined ? { href: `/archive/${product.id}`, label: "상품 상세보기" } : action;

  const dateValue =
    v.status === "verified"
      ? v.verifiedAt
      : v.status === "in_review"
        ? `${v.expectedAt ?? "-"} 예정`
        : "보류 · 자료 요청";

  return (
    <article
      className={cx("flex w-full flex-col overflow-hidden border border-ink bg-white text-ink", className)}
      aria-label={`${product.name} 인증 카드 · ${VERIFICATION_STATUS[v.status].label}`}
    >
      {/* 헤더 */}
      <header className="flex h-12 items-center justify-between border-b border-ink px-5">
        <Logo className="text-[17px]" />
        <span className="eyebrow !text-[9px] !tracking-[0.2em] text-sub">Uniqlo Vintage Loop</span>
      </header>

      <StatusBand v={v} />

      {/* 제품 이미지 */}
      <div className="relative aspect-[5/4] overflow-hidden bg-paper">
        <span
          className="display pointer-events-none absolute -left-1 -top-3 select-none text-[132px] text-white"
          aria-hidden
        >
          {shortYear(product.season)}
        </span>
        <GarmentImage
          spec={product.garment}
          label={product.nameKo}
          className={cx("relative h-full w-full p-[9%]", v.status !== "verified" && "opacity-90")}
        />
        <div className="absolute bottom-0 right-0 flex flex-col items-center justify-center bg-ink px-3 py-2 text-white">
          <span className="text-[9px] font-semibold tracking-[0.16em]">RARITY</span>
          <span className="display text-[30px] leading-none">{rarity.grade}</span>
        </div>
        <span className="absolute bottom-2.5 left-3 text-[10px] font-semibold tracking-[0.12em] text-sub">
          {product.collection.toUpperCase()}
        </span>
      </div>

      {/* 제품 정보 */}
      <div className="px-5 pb-5 pt-5">
        <p className="eyebrow !text-[10px] text-brand">{product.archiveType.en}</p>
        <h3 className="mt-1.5 text-[21px] font-extrabold leading-[1.15] tracking-[-0.03em]">{product.name}</h3>
        <p className="mt-1 text-[13px] text-sub">{product.nameKo}</p>

        <dl className="mt-4 grid grid-cols-2 border-l border-t border-line">
          <Field label="출시 시즌" value={seasonLabel(product.season)} />
          <Field label="컬렉션 / 유형" value={`${product.collection} · ${product.archiveType.label}`} />
          <Field
            label="희귀도 등급"
            value={`${rarity.grade} · ${RARITY_LABEL[rarity.grade]} (${rarity.score})`}
            accent={rarity.grade === "S" || rarity.grade === "A"}
          />
          <Field label="검증일" value={dateValue} muted={v.status !== "verified"} />
        </dl>

        {/* 인증번호 — 티켓처럼 절취선으로 분리 */}
        <div className="mt-4 border-y border-dashed border-faint py-3.5">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-sub">
                인증번호 <span className="text-faint">Certificate No.</span>
              </p>
              {v.certNo ? (
                <p className="mt-1 whitespace-nowrap text-[16px] font-extrabold tracking-[0.04em]">{v.certNo}</p>
              ) : (
                <p className="mt-1 text-[15px] font-bold text-faint">
                  {v.status === "in_review" ? "검증 완료 후 발급" : "발급 보류"}
                </p>
              )}
              <p className="mt-0.5 text-[11px] text-faint">
                접수 {v.requestNo} · {v.requestedAt}
              </p>
            </div>
            {v.certNo ? (
              <Barcode code={v.certNo} />
            ) : (
              <span className="h-8 w-[72px] shrink-0 bg-[repeating-linear-gradient(90deg,var(--color-line)_0_1px,transparent_1px_4px)]" aria-hidden />
            )}
          </div>
        </div>

        {/* 검증 기준 항목 */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <h4 className="text-[14px] font-extrabold">검증 기준 항목</h4>
            <span className="text-[12px] text-sub">
              통과 <b className="text-ink">{passed}</b> / {total}
            </span>
          </div>
          <ul className="mt-2.5 divide-y divide-line border-y border-line">
            {v.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3 py-2.5">
                <ResultMark result={c.result} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cx("text-[13px] font-bold", c.result === "pending" && "text-sub")}>{c.label}</span>
                    <span
                      className={cx(
                        "shrink-0 text-[11px] font-semibold",
                        c.result === "pass" && "text-ink",
                        c.result === "pending" && "text-faint",
                        c.result === "flag" && "text-brand",
                      )}
                    >
                      {CHECK_RESULT_LABEL[c.result]}
                    </span>
                  </div>
                  <p className={cx("mt-0.5 text-[12px] leading-snug", c.result === "flag" ? "text-ink" : "text-sub")}>
                    {c.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 상태별 안내 */}
        {v.status === "needs_review" && v.note && (
          <p className="mt-4 border-l-[3px] border-brand bg-brand-tint px-3.5 py-3 text-[12px] leading-relaxed">
            <b className="block text-[13px] text-brand">추가 자료 요청</b>
            {v.note}
          </p>
        )}
        {v.status === "in_review" && (
          <p className="mt-4 bg-paper px-3.5 py-3 text-[12px] leading-relaxed text-sub">
            {VERIFICATION_STATUS.in_review.desc} 완료되면 인증번호가 발급되고 알림으로 알려 드려요.
          </p>
        )}

        {cta && (
          <Link
            href={cta.href}
            className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 bg-ink text-[15px] font-bold text-white transition-colors hover:bg-black"
          >
            {cta.label}
            <ArrowRight size={16} />
          </Link>
        )}

        <p className="mt-3 text-center text-[10px] leading-relaxed text-faint">
          RE:FOUND 자체 검증 기준에 따른 데모 인증입니다. 유니클로 공식 인증이 아닙니다.
        </p>
      </div>
    </article>
  );
}
