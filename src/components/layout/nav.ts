import { Compass, House, ScanLine, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "홈", desktopLabel: "홈", icon: House },
  { href: "/explore", label: "발견", desktopLabel: "발견하기", icon: Compass },
  { href: "/scan", label: "스캔", desktopLabel: "스캔하기", icon: ScanLine },
  { href: "/my", label: "MY", desktopLabel: "나의 옷장", icon: User },
] as const;

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/explore") {
    return ["/explore", "/archive", "/market", "/checkout"].some((p) => pathname.startsWith(p));
  }
  // 판매 정보 작성 · 등록 완료(Figma 10 · 11)는 나의 옷장 메뉴에 속한다
  if (href === "/my") return pathname.startsWith("/my") || pathname.startsWith("/sell");
  return pathname.startsWith(href);
}
