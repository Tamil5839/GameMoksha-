"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoardIcon, HistoryIcon, SeasonIcon } from "@/components/icons";

const TABS = [
  { href: "/board", label: "Board", icon: BoardIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/seasons", label: "Seasons", icon: SeasonIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/40 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  active ? "text-vermilion" : "text-ink-soft"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
