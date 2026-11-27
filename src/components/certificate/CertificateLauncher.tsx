"use client";

import { useCallback, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CertificateData } from "@/types";
import { CERT_EM, CertificateFront } from "./CertificateFaces";
import { CertificateModal } from "./CertificateModal";

/**
 * 상세 페이지 검증 완료 영역에 놓는 인증서 진입점.
 * 작은 앞면 썸네일 + "RE:FOUND 인증서 보기" 버튼 → 플립 인증서 모달.
 */
export function CertificateLauncher({ certificate }: { certificate: CertificateData }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <div className="flex flex-col gap-3 border border-ink p-3 md:flex-row md:items-center md:gap-5 md:pr-4">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="인증서 썸네일 — 인증서 크게 보기"
            className="@container w-[64px] shrink-0 transition-transform hover:-translate-y-0.5 md:w-[78px]"
          >
            <span
              className="block aspect-[2/3] overflow-hidden rounded-[1.6em] shadow-[0_0.8em_1.6em_-0.6em_rgba(0,0,0,0.5)]"
              style={{ fontSize: CERT_EM }}
              aria-hidden
            >
              <CertificateFront certificate={certificate} />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-[10px] text-brand">
              {certificate.level === "verified" ? "Archive Certificate" : "Archive Record Card"}
            </p>
            <p className="mt-1 text-[15px] font-extrabold tracking-[-0.02em]">
              {certificate.level === "verified"
                ? "검증 완료 인증서가 발급되었습니다"
                : certificate.level === "archive_matched"
                  ? "아카이브 정보 확인 카드 · 정품 인증 아님"
                  : "AI 분석 기록 카드 · 정품 인증 아님"}
            </p>
            <p className="mt-0.5 text-[12px] text-sub">
              {certificate.numberLabel} <b className="font-bold text-ink">{certificate.certNo}</b>
              {certificate.isDemo && <span className="text-faint"> · 검증 예시</span>}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-[52px] shrink-0 items-center justify-center gap-1.5 bg-brand px-6 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark md:w-[228px]"
        >
          RE:FOUND 인증서 보기
          <ArrowRight size={16} />
        </button>
      </div>

      <CertificateModal open={open} onClose={close} certificate={certificate} />
    </>
  );
}
