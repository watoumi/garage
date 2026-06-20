import { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle lift on hover (use for clickable cards). */
  hover?: boolean;
}

export function Card({ hover, className, ...props }: CardProps) {
  return <div className={cn("card", hover && "card-hover", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center justify-between gap-3 border-b hair px-5 pb-3 pt-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-bold tracking-tight", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
