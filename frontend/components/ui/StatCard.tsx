import { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional trend indicator, e.g. { value: "+12%", positive: true }. */
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  className?: string;
}

/** Dashboard metric tile: label, big value, optional trend + icon. */
export function StatCard({ label, value, delta, icon, className }: StatCardProps) {
  return (
    <div className={cn("card flex items-start justify-between gap-4 p-5", className)}>
      <div className="min-w-0">
        <p className="label mb-2">{label}</p>
        <p className="font-mono text-3xl font-bold text-navy">{value}</p>
        {delta && (
          <p className={cn("mt-2 text-xs font-semibold", delta.positive ? "text-teal" : "text-danger")}>
            {delta.positive ? "▲" : "▼"} {delta.value}
          </p>
        )}
      </div>
      {icon && (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          {icon}
        </div>
      )}
    </div>
  );
}

export default StatCard;
