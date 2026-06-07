import * as React from "react";
import { cn } from "@/lib/utils";

type ChipVariant = "default" | "active" | "success" | "warning" | "error" | "emergency";

const variantClasses: Record<ChipVariant, string> = {
  default: "bg-background text-text-secondary",
  active: "bg-primary text-white",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  emergency: "bg-emergency-banner text-white",
};

export function Chip({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: ChipVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
