"use client";

import * as React from "react";
import type { EmergencyMode } from "@/types";

// 緊急モードの状態はサーバー（DB）が真実。レイアウトから初期値を受け取り、
// クライアントの nav/配色切替に共有する（localStorage は使わない）。
const EmergencyContext = React.createContext<{ mode: EmergencyMode }>({
  mode: { active: false, triggerSource: "manual" },
});

export function EmergencyProvider({
  mode,
  children,
}: {
  mode: EmergencyMode;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("emergency-mode", mode.active);
    return () => document.body.classList.remove("emergency-mode");
  }, [mode.active]);

  return <EmergencyContext.Provider value={{ mode }}>{children}</EmergencyContext.Provider>;
}

export function useEmergency() {
  return React.useContext(EmergencyContext);
}
