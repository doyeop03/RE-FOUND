import { useId } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { GarmentImage } from "@/components/garment/GarmentImage";
import { cx } from "@/lib/format";
import { barcodeBars } from "@/lib/verification";
import type { CertificateData } from "@/types";

/*
 * 인증서 앞 · 뒷면.
 *
 * 모든 치수는 em 단위다. 카드(@container) 폭의 1/34를 1em으로 잡기 때문에
 * 카드 폭이 340px이면 1em = 10px이고, 화면이 작아지면 실물 카드처럼 통째로 축소된다.
 * → 모바일에서 글자가 잘리거나 줄바꿈 때문에 레이아웃이 깨지지 않는다.
 */

export const CERT_EM = "calc(100cqw / 34)";

/** 단계별 문구 — 검증 완료가 아닌 카드는 '정품 인증 아님'을 앞 · 뒷면 모두에 적는다 */
const LEVEL_TEXT: Record<CertificateData["level"], { ring: string; lines: [string, string]; sub: string; back: string; label: string }> = {
  verified: {
    ring: "OLD UNIQLO · RE:FOUND · ARCHIVE VERIFIED ·",
    lines: ["ARCHIVE", "VERIFIED"],
    sub: "OLD UNIQLO AUTHENTICATION",
    back: "VERIFIED ARCHIVE",
    label: "검증 완료",
  },
  archive_matched: {
    ring: "NOT AUTHENTICATED · RE:FOUND · ARCHIVE MATCHED ·",
    lines: ["ARCHIVE", "MATCHED"],
    sub: "아카이브 정보 확인 · 정품 인증 아님",
    back: "ARCHIVE MATCHED",
    label: "아카이브 정보 확인",
  },
  ai_analyzed: {
    ring: "NOT AUTHENTICATED · RE:FOUND · AI ANALYZED ·",
    lines: ["AI", "ANALYZED"],
    sub: "AI 분석 기록 · 정품 인증 아님",
    back: "AI ANALYSIS RECORD",
    label: "AI 분석 완료",
  },
};

function Wordmark({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <span className={cx("font-extrabold tracking-[-0.04em]", invert ? "text-white" : "text-ink", className)}>
      RE<span className="text-brand">:</span>FOUND
    </span>
  );
}

/** 원형 인증 씰 — 가운데 두 개의 레드 점은 RE:FOUND 로고의 콜론(:)에서 가져왔다. 링 문구는 8시 방향에서 시계 방향으로 시작한다 */
function Seal({ ring: ringText }: { ring: string }) {
  const id = useId().replace(/:/g, "");
  const ring = `seal-${id}`;
  return (
    <svg viewBox="0 0 120 120" className="relative h-full w-full" aria-hidden>
      <defs>
        <path id={ring} d="M60,13 a47,47 0 1,1 0,94 a47,47 0 1,1 0,-94" />
      </defs>
      <circle cx="60" cy="60" r="58" fill="#171717" fillOpacity="0.6" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.7" />
      <circle cx="60" cy="60" r="43" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" />
      <text fill="#fff" fillOpacity="0.85" fontSize="6" fontWeight="600" letterSpacing="2" transform="rotate(-128 60 60)">
        <textPath href={`#${ring}`} textLength="292" lengthAdjust="spacing">
          {ringText}
        </textPath>
      </text>
      <circle cx="60" cy="51" r="4.6" fill="#E60012" />
      <circle cx="60" cy="69" r="4.6" fill="#E60012" />
    </svg>
  );
}

/** 앞면 — 차콜 블랙 커버 (Figma 인증서 앞) */
export function CertificateFront({ certificate: c }: { certificate: CertificateData }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#171717] px-[2.3em] pb-[2.6em] pt-[2.5em] text-white">
      {/* 루프 패턴 — 카드 위쪽 가운데에서 퍼지는 동심원 (Vintage Loop) */}
      <svg
        viewBox="0 0 400 400"
        className="pointer-events-none absolute left-1/2 top-[42%] h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx="200" cy="200" r={11 + i * 8.5} fill="none" stroke="#fff" strokeOpacity="0.09" strokeWidth="0.45" />
        ))}
      </svg>

      {/* 상단 */}
      <div className="relative flex items-center justify-between">
        <Wordmark invert className="text-[1.9em]" />
        {c.isDemo && (
          <span className="border border-white/50 px-[0.5em] py-[0.15em] text-[0.75em] font-bold tracking-[0.2em] text-white/85">
            DEMO
          </span>
        )}
      </div>
      <div className="relative mt-[1.9em] h-[0.1em] bg-white/20" />

      {/* 중앙 */}
      <div className="relative flex flex-1 flex-col items-center text-center">
        <div className="mt-[2.2em] size-[11.8em]">
          <Seal ring={LEVEL_TEXT[c.level].ring} />
        </div>
        <p className="mt-[0.53em] text-[4.15em] font-bold leading-[1.1] tracking-[-0.01em]">
          {LEVEL_TEXT[c.level].lines[0]}
          <br />
          {LEVEL_TEXT[c.level].lines[1]}
        </p>
        <span className="mt-[2.3em] block h-[0.2em] w-[2.5em] bg-brand" />
        <p className="mt-[2.55em] text-[0.9em] font-semibold tracking-[0.02em] text-white/60">{LEVEL_TEXT[c.level].sub}</p>
      </div>

      {/* 하단 */}
      <div className="relative grid grid-cols-2 items-end text-[0.82em] font-bold text-white/90">
        <p>UNIQLO VINTAGE LOOP</p>
        <p>No. {c.serial}</p>
      </div>
      <p className="relative mt-[1em] text-[0.7em] text-white/40">
        {c.isDemo
          ? "검증 예시 · 공식 정품 보증 아님"
          : c.level === "verified"
            ? "RE:FOUND Archive Certificate"
            : `${LEVEL_TEXT[c.level].label} · 정품 인증 아님`}
      </p>
    </div>
  );
}

function Info({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="min-w-0 border-b border-r border-line px-[0.8em] py-[0.75em]">
      <dt className="text-[0.82em] text-faint">{label}</dt>
      <dd className={cx("mt-[0.3em] truncate text-[1.25em] font-bold leading-snug", accent && "text-brand")}>
        {value}
        {sub && <span className="ml-[0.3em]">{sub}</span>}
      </dd>
    </div>
  );
}

/** 뒷면 — 화이트 카드에 제품 사진과 검증 정보 (Figma 인증서 뒤) */
export function CertificateBack({
  certificate: c,
  onNavigate,
}: {
  certificate: CertificateData;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-white p-[2em] text-ink">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <Wordmark className="text-[1.9em]" />
        <span className="flex items-center gap-[0.6em] text-[0.7em] font-bold tracking-[0.15em]">
          {c.level === "verified" && (
            <span className="flex size-[2em] items-center justify-center rounded-full bg-brand text-white">
              <Check className="size-[1.3em]" strokeWidth={3.5} />
            </span>
          )}
          {LEVEL_TEXT[c.level].back}
        </span>
      </div>
      <div className="mt-[1.2em] h-[0.1em] bg-[#666]" />

      {/* 제품 이미지 */}
      <div className="relative mt-[1em] min-h-0 flex-1 bg-paper">
        {c.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 사용자 촬영 사진 또는 권한 확인된 사진
          <img src={c.photoUrl} alt={c.productNameKo} className="absolute inset-0 h-full w-full object-cover" />
        ) : c.garment ? (
          <GarmentImage spec={c.garment} label={c.productNameKo} className="absolute inset-0 h-full w-full p-[3%]" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center text-center text-faint">
            <span className="text-[1.6em] font-extrabold tracking-[-0.03em]">NO PHOTO</span>
            <span className="mt-[0.3em] text-[0.95em]">공개 가능한 사진 없음</span>
          </span>
        )}
        {c.isDemo && (
          <span className="absolute left-[0.6em] top-[0.6em] border border-ink bg-white px-[0.4em] py-[0.15em] text-[0.7em] font-bold">
            DEMO · 검증 예시
          </span>
        )}
      </div>

      {/* 제품명 */}
      <p className="mt-[0.55em] line-clamp-2 text-[2em] font-bold leading-[1.15] tracking-[-0.02em]">{c.productName}</p>
      <p className="mt-[0.6em] text-[1em] text-sub">{c.productNameKo}</p>

      {/* 정보 */}
      <dl className="mt-[1.1em] grid grid-cols-2 border-l border-t border-line">
        <Info label="출시 시즌" value={c.season} sub={c.seasonEstimated ? "추정" : undefined} />
        <Info label="컬렉션" value={c.collection} />
        {c.vintageType ? (
          <Info label="빈티지 유형" value={c.vintageType} />
        ) : (
          <Info label="희귀도 등급" value={c.rarityGrade ?? "—"} sub={c.rarityLabel} />
        )}
        <Info label={c.dateLabel} value={c.verifiedAt} />
      </dl>

      {/* 검증 번호 */}
      <div className="mt-[0.9em] flex items-end justify-between gap-[1em]">
        <div className="min-w-0">
          <p className="text-[0.82em] text-sub">{c.numberLabel}</p>
          <p className="mt-[0.3em] whitespace-nowrap text-[1.5em] font-bold tracking-[0.01em]">{c.certNo}</p>
        </div>
        <span className="mb-[0.4em] flex h-[2em] shrink-0 items-stretch gap-[0.1em]" aria-hidden>
          {barcodeBars(c.certNo).map((w, i) => (
            <span key={i} className={i % 2 === 0 ? "bg-ink" : ""} style={{ width: `${w * 0.1}em` }} />
          ))}
        </span>
      </div>

      {/* 검증 항목 */}
      <ul className="mt-[0.9em] grid grid-cols-2 gap-x-[1em] gap-y-[0.75em]">
        {c.items.map((item) => (
          <li key={item.label} className="flex items-center gap-[0.55em] text-[0.9em] font-bold" title={item.detail}>
            <span
              className={cx(
                "flex size-[1.25em] shrink-0 items-center justify-center",
                item.passed ? "bg-ink text-white" : "border border-faint",
              )}
            >
              {item.passed && <Check className="size-[0.9em]" strokeWidth={3.5} />}
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      {/* 하단 */}
      <div className="mt-[1.6em] flex items-end justify-between gap-[1em]">
        <p className="text-[0.7em] leading-snug text-faint">
          {c.isDemo ? (
            <>
              데모 데이터 · 검증 예시
              <br />
              공식 정품 보증이 아닙니다.
            </>
          ) : c.level === "verified" ? (
            "RE:FOUND Archive Certificate"
          ) : (
            <>
              {LEVEL_TEXT[c.level].label}
              <br />
              정품 인증이 아닙니다.
            </>
          )}
        </p>
        <Link
          href={c.detailHref}
          onClick={(e) => {
            // 카드 뒤집기로 전파되지 않게 막는다
            e.stopPropagation();
            onNavigate?.();
          }}
          className="flex h-[3.1em] w-[15.3em] shrink-0 items-center justify-center border border-ink text-[0.9em] font-bold transition-colors hover:bg-ink hover:text-white"
        >
          아카이브 상세보기
        </Link>
      </div>
    </div>
  );
}
