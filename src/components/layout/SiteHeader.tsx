"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, MapPin, ScanLine, Search, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DemoTag, Logo } from "@/components/ui/primitives";
import { cx } from "@/lib/format";
import { NAV_ITEMS, isActivePath } from "./nav";

const NOTIFICATIONS = [
  {
    icon: MapPin,
    title: "OLD UNIQLO를 발견하셨나요?",
    body: "근처 빈티지 숍 '세컨드룸'에 계신가요? 발견한 옷의 출시 시기와 희귀도를 확인해 보세요.",
    time: "지금",
    href: "/scan",
    unread: true,
  },
  {
    icon: Sparkles,
    title: "이번 주 새로 발견된 아카이브 5건",
    body: "올드 유니클로 떡볶이 더플코트가 새로 아카이브에 등록되었어요.",
    time: "2시간 전",
    href: "/explore",
    unread: true,
  },
  {
    icon: ScanLine,
    title: "찜한 제품의 매물이 새로 올라왔어요",
    body: "Old Uniqlo Italian Cotton Jacket · 현재 매물 4건",
    time: "어제",
    href: "/market/plusj-09-coat",
    unread: false,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="container-page flex h-14 items-center justify-between md:h-16">
          <div className="flex items-center gap-2.5">
            <Link href="/" aria-label="RE:FOUND 홈" className="flex h-11 items-center">
              <Logo className="text-[22px] md:text-[24px]" />
            </Link>
            <DemoTag />
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "relative flex h-16 items-center px-4 text-[15px] font-semibold transition-colors",
                    active ? "text-ink" : "text-sub hover:text-ink",
                  )}
                >
                  {item.desktopLabel}
                  {active && <span className="absolute inset-x-4 bottom-0 h-[3px] bg-brand" />}
                </Link>
              );
            })}
            <Link
              href="/nearby"
              className={cx(
                "relative flex h-16 items-center px-4 text-[15px] font-semibold transition-colors",
                isActivePath(pathname, "/nearby") ? "text-ink" : "text-sub hover:text-ink",
              )}
            >
              빈티지 숍
              {isActivePath(pathname, "/nearby") && (
                <span className="absolute inset-x-4 bottom-0 h-[3px] bg-brand" />
              )}
            </Link>
          </nav>

          <div className="-mr-2.5 flex items-center">
            <Link href="/explore?focus=1" aria-label="검색" className="flex h-11 w-11 items-center justify-center">
              <Search size={22} strokeWidth={1.8} />
            </Link>
            <button
              type="button"
              aria-label="알림"
              onClick={() => setOpen(true)}
              className="relative flex h-11 w-11 items-center justify-center"
            >
              <Bell size={22} strokeWidth={1.8} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand" />
            </button>
          </div>
        </div>
      </header>

      <Modal open={open} onClose={() => setOpen(false)} title="알림" eyebrow="Notifications">
        <ul className="-mx-5 -mt-5 divide-y divide-line">
          {NOTIFICATIONS.map((n) => (
            <li key={n.title}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex gap-3 px-5 py-4 hover:bg-paper"
              >
                <span className={cx("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center", n.unread ? "bg-brand text-white" : "bg-paper text-ink")}>
                  <n.icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[14px] font-bold">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-faint">{n.time}</span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-sub">{n.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] leading-relaxed text-faint">
          데모용 알림입니다. 실제 위치 기반 푸시 알림은 후속 개발 항목입니다.
        </p>
      </Modal>
    </>
  );
}
