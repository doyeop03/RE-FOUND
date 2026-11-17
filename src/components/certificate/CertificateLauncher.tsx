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
      <div className="flex items-center gap-4 border border-ink p-3 pr-4 md:gap-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="인증서 썸네일 — 인증서 크게 보기"
          className="@container w-[64px] shrink-0 transition-transform hover:-translate-y-0.5 md:w-[76px]"
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
          <p className="eyebrow !text-[10px] text-brand">Archive Certificate</p>
          <p className="mt-1 text-[15px] font-extrabold tracking-[-0.02em]">검증 완료 인증서가 발급되었습니다</p>
          <p className="mt-0.5 text-[12px] text-sub">
            검증 번호 <b className="font-bold text-ink">{certificate.certNo}</b>
            {certificate.isDemo && <span className="text-faint"> · 검증 예시</span>}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 inline-flex h-11 items-center gap-1.5 bg-ink px-4 text-[14px] font-bold text-white transition-colors hover:bg-black"
          >
            <span>
              RE<span className="text-brand">:</span>FOUND 인증서 보기
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <CertificateModal open={open} onClose={close} certificate={certificate} />
    </>
  );
}
