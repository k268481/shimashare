"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEmergency } from "@/lib/EmergencyContext";
import { cn } from "@/lib/utils";

export function TopNav({ nickname }: { nickname?: string }) {
  const { mode } = useEmergency();
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b backdrop-blur",
        mode.active
          ? "border-emergency-banner bg-emergency-banner/95 text-white"
          : "border-border bg-surface/85",
      )}
    >
      <div className="container-app flex h-14 items-center justify-between">
        <Link
          href="/home"
          className="font-display text-xl font-bold tracking-tight"
          aria-label="シマシェア ホーム"
        >
          シマシェア
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {pathname !== "/home" && (
            <Link
              href="/home"
              className={cn(
                "rounded-[6px] px-3 py-2",
                mode.active ? "hover:bg-white/20" : "hover:bg-background",
              )}
            >
              ホーム
            </Link>
          )}
          <Link
            href="/mypage"
            className={cn(
              "rounded-[6px] px-3 py-2",
              mode.active ? "hover:bg-white/20" : "hover:bg-background",
            )}
          >
            {nickname ? `${nickname}さん` : "マイページ"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
