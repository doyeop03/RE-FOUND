import { BookOpen, Compass, House, ScanLine, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "홈", desktopLabel: "홈", icon: House },
  { href: "/explore", label: "발견", desktopLabel: "발견하기", icon: Compass },
  { href: "/scan", label: "스캔", desktopLabel: "스캔하기", icon: ScanLine },
  { href: "/magazine", label: "매거진", desktopLabel: "매거진", icon: BookOpen },
  { href: "/my", label: "MY", desktopLabel: "나의 옷장", icon: User },
] as const;

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/explore") {
    return pathname.startsWith("/explore") || pathname.startsWith("/archive");
  }
  return pathname.startsWith(href);
}
