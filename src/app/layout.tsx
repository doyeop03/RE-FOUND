import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RE:FOUND — UNIQLO VINTAGE LOOP",
    template: "%s | RE:FOUND",
  },
  description:
    "오래된 유니클로의 가치를 다시 발견하다. 발견하고, 인증받고, 다시 입고, 다시 순환하는 빈티지 루프 (프로토타입).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        {/* 상세 페이지의 모바일 고정 액션 바가 있을 때는 그 높이만큼 여백을 더 둔다 */}
        <div className="pb-16 md:pb-0 [body:has([data-action-bar])_&]:pb-36 md:[body:has([data-action-bar])_&]:pb-0">
          <SiteFooter />
        </div>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
