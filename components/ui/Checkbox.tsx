import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, id, ...props },
  ref,
) {
  const generated = React.useId();
  const inputId = id ?? generated;
  return (
    <label
      htmlFor={inputId}
      className="flex min-h-tap cursor-pointer items-start gap-3 py-1 text-base text-text-primary"
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          "mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-full border-2 border-border",
          "checked:border-primary checked:bg-primary",
          "focus:outline-none focus:shadow-focus",
          className,
        )}
        {...props}
      />
      {label && <span className="leading-tight">{label}</span>}
    </label>
  );
});
