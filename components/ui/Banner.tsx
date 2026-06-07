import * as React from "react";
import { cn } from "@/lib/utils";

type BannerTone = "info" | "warning" | "emergency";

const toneClasses: Record<BannerTone, string> = {
  info: "border-border bg-background text-text-primary",
  warning: "border-warning/30 bg-warning/10 text-text-primary",
  emergency: "border-emergency-banner bg-emergency-banner text-white",
};

export function Banner({
  tone = "info",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: BannerTone }) {
  return (
    <div
      role="status"
      className={cn("rounded-card border px-4 py-3 text-base font-medium", toneClasses[tone], className)}
      {...props}
    >
      {children}
    </div>
  );
}
