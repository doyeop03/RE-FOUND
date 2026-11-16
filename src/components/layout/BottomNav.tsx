"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/format";
import { NAV_ITEMS, isActivePath } from "./nav";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="하단 탭"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-[520px] grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                  active ? "text-ink" : "text-faint",
                )}
              >
                {active && <span className="absolute top-0 h-[3px] w-8 bg-brand" />}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.7} className={active ? "text-brand" : undefined} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
