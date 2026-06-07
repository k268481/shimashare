import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "cta";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:-translate-y-px hover:shadow-primary",
  secondary:
    "bg-surface text-text-primary border border-border hover:-translate-y-px hover:border-primary",
  ghost: "text-text-primary hover:bg-background",
  destructive:
    "bg-surface text-error border border-error hover:-translate-y-px hover:bg-error hover:text-white",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-[38px] px-4 text-base",
  lg: "h-11 px-5 text-button",
  // SPEC.md 9.2: CTAは56px・ボタン文字18px以上
  cta: "min-h-cta px-6 text-button",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", fullWidth, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[6px] font-medium",
          "transition-all duration-200 focus-visible:outline-none focus-visible:shadow-focus",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      />
    );
  },
);
