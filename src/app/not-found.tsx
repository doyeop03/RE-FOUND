import Link from "next/link";
import { buttonLinkClass } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="display text-[72px] text-brand md:text-[120px]">404</p>
      <p className="mt-4 text-[18px] font-extrabold">찾을 수 없는 페이지예요</p>
      <p className="mt-1 text-[14px] text-sub">주소가 바뀌었거나 아직 아카이브에 없는 제품일 수 있어요.</p>
      <Link href="/explore" className={`${buttonLinkClass.dark} mt-6`}>
        아카이브 둘러보기
      </Link>
    </div>
  );
}
