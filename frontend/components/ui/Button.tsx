import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "whatsapp" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  whatsapp: "btn-whatsapp",
  danger: "btn-danger",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "",
  lg: "px-6 py-3 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** Primary action button. Wraps the design-system `.btn-*` classes. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", leftIcon, rightIcon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export default Button;
