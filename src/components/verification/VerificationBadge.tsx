import { Check } from "lucide-react";
import { cx } from "@/lib/format";
import { VERIFICATION_STATUS } from "@/lib/verification";
import type { VerificationStatus } from "@/types";

const SIZE = {
  xs: { box: "h-[18px]", mark: "w-[18px]", text: "px-1.5 text-[10px]", icon: 11, dot: "size-1.5" },
  sm: { box: "h-[22px]", mark: "w-[22px]", text: "px-1.5 text-[11px]", icon: 13, dot: "size-[7px]" },
  md: { box: "h-7", mark: "w-7", text: "px-2.5 text-[13px]", icon: 15, dot: "size-2" },
} as const;

/** 상태 마크 — 검증 완료: 레드 체크 / 진행 중: 블랙 펄스 / 확인 필요: 레드 느낌표 */
function StatusMark({ status, size }: { status: VerificationStatus; size: keyof typeof SIZE }) {
  const s = SIZE[size];
  if (status === "verified") {
    return (
      <span className={cx("flex shrink-0 items-center justify-center bg-brand text-white", s.mark)}>
        <Check size={s.icon} strokeWidth={3} />
      </span>
    );
  }
  if (status === "in_review") {
    return (
      <span className={cx("flex shrink-0 items-center justify-center bg-ink", s.mark)}>
        <span className={cx("relative flex", s.dot)}>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
          <span className="relative inline-flex h-full w-full rounded-full bg-white" />
        </span>
      </span>
    );
  }
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center bg-white font-black text-brand ring-1 ring-inset ring-brand",
        s.mark,
      )}
    >
      !
    </span>
  );
}

interface Props {
  status: VerificationStatus;
  size?: keyof typeof SIZE;
  /** true면 "RE:FOUND" 워드마크를 함께 표시한다 (상세 페이지 상단 등) */
  branded?: boolean;
  className?: string;
}

/**
 * 축약형 인증 배지.
 * 상품 카드 이미지 위, 리스트 행, 상세 페이지 상단 태그 줄 어디에나 붙일 수 있다.
 * 희귀도 배지(레드 · 블랙 면)와 겹쳐 보이지 않도록 "마크 + 흰 라벨" 2단 구조를 쓴다.
 */
export function VerificationBadge({ status, size = "sm", branded = false, className }: Props) {
  const s = SIZE[size];
  const meta = VERIFICATION_STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex items-stretch overflow-hidden bg-white font-bold text-ink shadow-[0_0_0_1px_rgba(17,17,17,0.12)]",
        s.box,
        className,
      )}
      title={`RE:FOUND ${meta.label}`}
    >
      <StatusMark status={status} size={size} />
      <span className={cx("flex items-center gap-1 whitespace-nowrap", s.text)}>
        {branded && (
          <span className="font-extrabold tracking-[-0.04em]">
            RE<span className="text-brand">:</span>FOUND
          </span>
        )}
        <span className={cx(status === "needs_review" && "text-brand")}>{meta.short}</span>
      </span>
    </span>
  );
}
