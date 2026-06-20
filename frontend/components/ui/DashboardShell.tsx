"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

export interface DashboardShellProps {
  nav: NavItem[];
  title: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * SaaS console layout: a sticky sidebar on desktop that collapses to a
 * horizontally-scrollable tab bar on mobile, plus a title header + content slot.
 */
export function DashboardShell({ nav, title, eyebrow, actions, children }: DashboardShellProps) {
  const path = usePathname();
  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav className="card flex gap-1 overflow-x-auto p-2 lg:flex-col">
          {nav.map((item) => {
            const active = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-accent text-white shadow-glow"
                    : "text-muted hover:bg-surface-muted hover:text-navy",
                )}
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </section>
    </div>
  );
}

export default DashboardShell;
