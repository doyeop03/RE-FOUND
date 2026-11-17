import { useId } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
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

function Wordmark({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <span className={cx("font-extrabold tracking-[-0.04em]", invert ? "text-white" : "text-ink", className)}>
      RE<span className="text-brand">:</span>FOUND
    </span>
  );
}

/** 원형 인증 씰 — 가운데 두 개의 레드 점은 RE:FOUND 로고의 콜론(:)에서 가져왔다 */
function Seal() {
  const id = useId().replace(/:/g, "");
  const ring = `seal-${id}`;
  return (
    <svg viewBox="0 0 120 120" className="relative h-full w-full" aria-hidden>
      <defs>
        <path id={ring} d="M60,13 a47,47 0 1,1 0,94 a47,47 0 1,1 0,-94" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="#fff" strokeOpacity="0.32" strokeWidth="0.6" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.6" />
      <text fill="#fff" fillOpacity="0.72" fontSize="6.6" fontWeight="600" letterSpacing="1.6">
        <textPath href={`#${ring}`} textLength="292" lengthAdjust="spacing">
          ARCHIVE VERIFIED · OLD UNIQLO · RE:FOUND ·
        </textPath>
      </text>
      {/* 눈금 */}
      {Array.from({ length: 24 }, (_, i) => (
        <line
          key={i}
          x1="60"
          y1="24"
          x2="60"
          y2={i % 6 === 0 ? 28 : 26}
          stroke="#fff"
          strokeOpacity={i % 6 === 0 ? 0.5 : 0.22}
          strokeWidth="0.6"
          transform={`rotate(${i * 15} 60 60)`}
        />
      ))}
      <circle cx="60" cy="51" r="4.6" fill="#E60012" />
      <circle cx="60" cy="69" r="4.6" fill="#E60012" />
    </svg>
  );
}

/** 앞면 — 차콜 블랙 커버 */
export function CertificateFront({ certificate: c }: { certificate: CertificateData }) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#161616] px-[2.4em] pb-[2.2em] pt-[2.4em] text-white">
      {/* 루프 패턴 — 씰을 중심으로 퍼지는 동심원 (Vintage Loop) */}
      <svg
        viewBox="0 0 400 400"
        className="pointer-events-none absolute left-1/2 top-[46%] h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        {Array.from({ length: 22 }, (_, i) => (
          <circle key={i} cx="200" cy="200" r={34 + i * 9} fill="none" stroke="#fff" strokeOpacity="0.045" strokeWidth="0.5" />
        ))}
      </svg>

      {/* 상단 */}
      <div className="relative flex items-center justify-between">
        <Wordmark invert className="text-[1.9em]" />
        {c.isDemo && (
          <span className="border border-white/35 px-[0.6em] py-[0.2em] text-[0.85em] font-bold tracking-[0.16em] text-white/70">
            DEMO
          </span>
        )}
      </div>
      <div className="relative mt-[1.6em] h-px bg-white/15" />

      {/* 중앙 */}
      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="size-[11.5em]">
          <Seal />
        </div>
        <p className="mt-[1.1em] text-[4.3em] font-extrabold leading-[0.92] tracking-[-0.045em]">
          ARCHIVE
          <br />
          VERIFIED
        </p>
        <span className="my-[1.5em] block h-[0.22em] w-[2.6em] bg-brand" />
        <p className="text-[1em] font-semibold tracking-[0.3em] text-white/60">OLD UNIQLO AUTHENTICATION</p>
      </div>

      {/* 하단 */}
      <div className="relative h-px bg-white/15" />
      <div className="relative mt-[1.3em] flex items-end justify-between">
        <div>
          <p className="text-[0.95em] font-bold tracking-[0.3em] text-white/85">UNIQLO VINTAGE LOOP</p>
          <p className="mt-[0.5em] text-[0.85em] text-white/40">
            {c.isDemo ? "검증 예시 · 공식 정품 보증 아님" : "RE:FOUND Archive Certificate"}
          </p>
        </div>
        <p className="text-right text-[0.85em] leading-tight text-white/45">
          No.
          <br />
          <span className="text-[1.4em] font-bold tracking-[0.06em] text-white/80">{c.serial}</span>
        </p>
      </div>
    </div>
  );
}

function Info({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="min-w-0 border-b border-r border-line px-[1em] py-[0.8em]">
      <dt className="text-[0.95em] text-sub">{label}</dt>
      <dd className={cx("mt-[0.15em] text-[1.3em] font-bold leading-snug", accent && "text-brand")}>
        {value}
        {sub && <span className="ml-[0.35em] text-[0.72em] font-medium text-faint">{sub}</span>}
      </dd>
    </div>
  );
}

/** 뒷면 — 화이트 카드에 제품 사진과 검증 정보 */
export function CertificateBack({
  certificate: c,
  onNavigate,
}: {
  certificate: CertificateData;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-white px-[2em] pb-[1.8em] pt-[2em] text-ink">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <Wordmark className="text-[1.7em]" />
        <span className="flex items-center gap-[0.5em] text-[0.95em] font-bold tracking-[0.2em]">
          <span className="flex size-[1.5em] items-center justify-center rounded-full bg-brand text-white">
            <Check className="size-[1em]" strokeWidth={3.5} />
          </span>
          VERIFIED ARCHIVE
        </span>
      </div>
      <div className="mt-[1.2em] h-px bg-ink" />

      {/* 제품 이미지 */}
      <div className="relative mt-[1.2em] min-h-0 flex-1 bg-paper">
        <GarmentImage spec={c.garment} label={c.productNameKo} className="absolute inset-0 h-full w-full p-[3%]" />
        {c.isDemo && (
          <span className="absolute left-[0.8em] top-[0.8em] border border-ink bg-white px-[0.5em] py-[0.15em] text-[0.85em] font-bold tracking-[0.12em]">
            DEMO · 검증 예시
          </span>
        )}
        <span className="absolute bottom-0 right-0 flex flex-col items-center bg-ink px-[0.8em] py-[0.4em] text-white">
          <span className="text-[0.75em] font-semibold tracking-[0.16em]">RARITY</span>
          <span className="text-[2.4em] font-extrabold leading-none tracking-[-0.04em]">{c.rarityGrade}</span>
        </span>
      </div>

      {/* 제품명 */}
      <p className="mt-[1.1em] line-clamp-2 text-[2em] font-extrabold leading-[1.1] tracking-[-0.03em]">{c.productName}</p>
      <p className="mt-[0.3em] text-[1.1em] text-sub">{c.productNameKo}</p>

      {/* 정보 */}
      <dl className="mt-[1em] grid grid-cols-2 border-l border-t border-line">
        <Info label="출시 시즌" value={c.season} sub={c.seasonEstimated ? "추정" : undefined} />
        <Info label="컬렉션" value={c.collection} />
        <Info label="희귀도 등급" value={c.rarityGrade} sub={c.rarityLabel} accent={c.rarityGrade === "S" || c.rarityGrade === "A"} />
        <Info label="검증일" value={c.verifiedAt} />
      </dl>

      {/* 검증 번호 */}
      <div className="flex items-center justify-between gap-[1em] border-b border-dashed border-faint py-[0.8em]">
        <div className="min-w-0">
          <p className="text-[0.95em] text-sub">검증 번호</p>
          <p className="whitespace-nowrap text-[1.5em] font-extrabold tracking-[0.06em]">{c.certNo}</p>
        </div>
        <span className="flex h-[2.6em] shrink-0 items-stretch gap-[0.1em]" aria-hidden>
          {barcodeBars(c.certNo).map((w, i) => (
            <span key={i} className={i % 2 === 0 ? "bg-ink" : ""} style={{ width: `${w * 0.1}em` }} />
          ))}
        </span>
      </div>

      {/* 검증 항목 */}
      <ul className="mt-[0.9em] grid grid-cols-2 gap-x-[1em] gap-y-[0.55em]">
        {c.items.map((item) => (
          <li key={item.label} className="flex items-center gap-[0.5em] text-[1.1em] font-semibold" title={item.detail}>
            <span
              className={cx(
                "flex size-[1.25em] shrink-0 items-center justify-center",
                item.passed ? "bg-ink text-white" : "border border-faint",
              )}
            >
              {item.passed && <Check className="size-[0.85em]" strokeWidth={3.5} />}
            </span>
            {item.label}
          </li>
        ))}
      </ul>

      {/* 하단 */}
      <div className="mt-[1.1em] flex items-center justify-between gap-[1em]">
        <p className="text-[0.85em] leading-snug text-faint">
          {c.isDemo ? (
            <>
              데모 데이터 · 검증 예시
              <br />
              공식 정품 보증이 아닙니다
            </>
          ) : (
            "RE:FOUND Archive Certificate"
          )}
        </p>
        <Link
          href={c.detailHref}
          onClick={(e) => {
            // 카드 뒤집기로 전파되지 않게 막는다
            e.stopPropagation();
            onNavigate?.();
          }}
          className="flex h-[2.9em] shrink-0 items-center gap-[0.35em] border border-ink px-[1.1em] text-[1.05em] font-bold transition-colors hover:bg-ink hover:text-white"
        >
          아카이브 상세보기
          <ArrowRight className="size-[1.1em]" />
        </Link>
      </div>
    </div>
  );
}
