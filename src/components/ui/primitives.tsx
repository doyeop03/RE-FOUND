import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/format";
import { RARITY_LABEL } from "@/lib/rarity";
import type { RarityGrade } from "@/types";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("font-extrabold tracking-[-0.04em]", className)}>
      RE<span className="text-brand">:</span>FOUND
    </span>
  );
}

/** 데모 데이터임을 알리는 표식 — 실제 인증과 혼동되지 않게 화면 곳곳에 쓴다 */
export function DemoTag({
  children = "DEMO",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center border border-ink px-1.5 text-[10px] font-bold tracking-[0.12em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RarityBadge({
  grade,
  size = "sm",
  withLabel = false,
}: {
  grade: RarityGrade;
  size?: "sm" | "md";
  withLabel?: boolean;
}) {
  const strong = grade === "S" || grade === "A";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 font-bold",
        size === "sm" ? "h-[22px] px-1.5 text-[11px]" : "h-7 px-2 text-[13px]",
        strong && "bg-brand text-white",
        grade === "B" && "bg-ink text-white",
        grade === "C" && "bg-white text-ink ring-1 ring-inset ring-ink",
      )}
    >
      <span className="font-medium opacity-80">희귀도</span>
      {grade}
      {withLabel && <span className="font-medium">· {RARITY_LABEL[grade]}</span>}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel = "전체 보기",
  invert = false,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  invert?: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
      <div>
        {eyebrow && (
          <p className={cx("eyebrow mb-2", invert ? "text-white/60" : "text-brand")}>
            {eyebrow}
          </p>
        )}
        <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.03em] md:text-[28px]">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className={cx(
            "-mr-2 flex h-11 shrink-0 items-center gap-1 px-2 text-[13px] font-medium",
            invert ? "text-white/70 hover:text-white" : "text-sub hover:text-ink",
          )}
        >
          {linkLabel}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "outline";
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex h-[52px] items-center justify-center gap-2 px-5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:bg-line disabled:text-faint",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "dark" && "bg-ink text-white hover:bg-black",
        variant === "outline" && "border border-ink bg-white text-ink hover:bg-paper",
        className,
      )}
    />
  );
}

export const buttonLinkClass = {
  primary:
    "inline-flex h-[52px] items-center justify-center gap-2 bg-brand px-5 text-[15px] font-bold text-white transition-colors hover:bg-brand-dark",
  dark: "inline-flex h-[52px] items-center justify-center gap-2 bg-ink px-5 text-[15px] font-bold text-white transition-colors hover:bg-black",
  outline:
    "inline-flex h-[52px] items-center justify-center gap-2 border border-ink bg-white px-5 text-[15px] font-bold text-ink transition-colors hover:bg-paper",
};
