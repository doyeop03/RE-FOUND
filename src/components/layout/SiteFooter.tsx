import Link from "next/link";
import { Logo } from "@/components/ui/primitives";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-ivory">
      <div className="container-page py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo className="text-[20px]" />
            <p className="mt-2 text-[13px] text-sub">UNIQLO VINTAGE LOOP — 발견하고, 인증받고, 다시 입고, 다시 순환하다.</p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium">
            <li><Link href="/explore" className="hover:text-brand">발견하기</Link></li>
            <li><Link href="/scan" className="hover:text-brand">스캔하기</Link></li>
            <li><Link href="/nearby" className="hover:text-brand">빈티지 숍</Link></li>
            <li><Link href="/my" className="hover:text-brand">나의 옷장</Link></li>
          </ul>
        </div>
        <p className="mt-8 border-t border-line pt-5 text-[12px] leading-relaxed text-faint">
          본 화면은 캠페인 기획을 위한 프로토타입이며 유니클로 공식 서비스가 아닙니다. &lsquo;DEMO&rsquo; 표시 제품의 정보 · 희귀도 ·
          가격은 시연용 가상 데이터입니다. &lsquo;Sourced Archive&rsquo;는 원문을 확인한 출처 자료이며, 스캔 결과는 실제 촬영 사진의
          Gemini 분석입니다. AI 분석은 정품 인증이 아니며, RE:FOUND의 정품 검증은 별도 검수로만 이루어집니다.
        </p>
      </div>
    </footer>
  );
}
