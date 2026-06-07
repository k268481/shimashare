"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEmergency } from "@/lib/EmergencyContext";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "ホーム", icon: "🏠" },
  { href: "/listings", label: "出品", icon: "🛒" },
  { href: "/shops", label: "店舗", icon: "🏪" },
  { href: "/chat", label: "チャット", icon: "💬" },
  { href: "/mypage", label: "マイページ", icon: "👤" },
];

const EMERGENCY_TABS = [
  { href: "/home", label: "ホーム", icon: "🏠" },
  { href: "/emergency", label: "これがない", icon: "📢" },
  { href: "/listings?free=1", label: "ゆずります", icon: "🤝" },
  { href: "/shops", label: "店舗", icon: "🏪" },
  { href: "/chat", label: "チャット", icon: "💬" },
];

export function BottomTabs() {
  const pathname = usePathname();
  const { mode } = useEmergency();
  const tabs = mode.active ? EMERGENCY_TABS : TABS;

  return (
    <nav
      className={cn(
        "sticky bottom-0 z-20 border-t",
        mode.active
          ? "border-emergency-accent bg-surface"
          : "border-border bg-surface",
      )}
      aria-label="メインナビゲーション"
    >
      <ul className="container-app grid grid-cols-5">
        {tabs.map((t) => {
          const href = t.href.split("?")[0];
          const active = pathname === href || (href !== "/home" && pathname.startsWith(href));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "flex min-h-tap flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs",
                  active
                    ? mode.active
                      ? "text-emergency-accent"
                      : "text-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {t.icon}
                </span>
                <span className="font-medium">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
