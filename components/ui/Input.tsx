import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "block w-full rounded-[6px] border bg-surface px-[14px] py-[10px] text-base",
        "placeholder:text-neutral",
        "focus:outline-none focus:shadow-focus",
        error
          ? "border-error focus:border-error"
          : "border-border focus:border-primary",
        className,
      )}
      {...props}
    />
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "block w-full rounded-[6px] border bg-surface px-[14px] py-[10px] text-base",
          "placeholder:text-neutral",
          "focus:outline-none focus:shadow-focus",
          error
            ? "border-error focus:border-error"
            : "border-border focus:border-primary",
          className,
        )}
        {...props}
      />
    );
  },
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "block w-full rounded-[6px] border bg-surface px-[14px] py-[10px] text-base",
        "focus:outline-none focus:shadow-focus",
        error
          ? "border-error focus:border-error"
          : "border-border focus:border-primary",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-text-primary">
      {children}
      {required && <span className="ml-1 text-error">*</span>}
      {hint && <span className="ml-2 text-xs font-normal text-text-secondary">{hint}</span>}
    </label>
  );
}
