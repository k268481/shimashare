"use client";

import * as React from "react";

// SPEC.md 5.4 / TASKS.md 4.6: ネット断時は「最終更新時刻」を明示
export function OfflineIndicator() {
  const [online, setOnline] = React.useState(true);
  const [lastUpdated] = React.useState(() => new Date());

  React.useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm">
      <span className="font-medium">現在オフラインです。</span>{" "}
      <span className="text-text-secondary">
        最終更新：
        {lastUpdated.toLocaleString("ja-JP", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
