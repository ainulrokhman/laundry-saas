import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconPosition?: "left" | "right";
  outline?: boolean;
}

/**
 * AdminLTE Button component
 * Enhanced button with icon support and AdminLTE styling
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  outline = false,
  className = "",
  ...props
}: ButtonProps) {
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const variantClass = outline ? `btn-outline-${variant}` : `btn-${variant}`;
  const iconElement = icon ? <i className={icon}></i> : null;

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon && iconPosition === "left" && (
        <>
          {iconElement} {children}
        </>
      )}
      {icon && iconPosition === "right" && (
        <>
          {children} {iconElement}
        </>
      )}
      {!icon && children}
    </button>
  );
}
