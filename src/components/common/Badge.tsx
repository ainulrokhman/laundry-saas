import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  color?: "primary" | "secondary" | "success" | "danger" | "warning" | "info";
  className?: string;
}

/**
 * AdminLTE Badge component
 * Displays badges with different colors
 */
export function Badge({
  children,
  color = "primary",
  className = "",
}: BadgeProps) {
  return (
    <span className={`badge bg-${color} ${className}`}>{children}</span>
  );
}
