import { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted border-hair",
  info: "bg-accent-soft text-accent-deep border-[rgba(37,99,235,0.28)]",
  success: "bg-[rgba(16,185,129,0.12)] text-success-deep border-[rgba(16,185,129,0.30)]",
  warning: "bg-[rgba(245,158,11,0.14)] text-[#b45309] border-[rgba(245,158,11,0.35)]",
  danger: "bg-[rgba(239,68,68,0.12)] text-danger border-[rgba(239,68,68,0.30)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

export default Badge;
