"use client";

import { useEmergency } from "@/lib/EmergencyContext";

export function EmergencyBanner() {
  const { mode } = useEmergency();
  if (!mode.active) return null;
  return (
    <div className="border-b border-emergency-accent bg-emergency-banner text-white">
      <div className="container-app flex items-center justify-between gap-3 py-2 text-sm font-semibold">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>⚠️</span>
          【台風モード】現在、{mode.warningText ?? "暴風警報発令中"}
        </span>
        <span className="text-xs font-normal opacity-90">
          安全を最優先に。無理な外出は控えてください。
        </span>
      </div>
    </div>
  );
}
