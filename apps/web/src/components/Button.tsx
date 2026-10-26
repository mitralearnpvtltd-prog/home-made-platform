import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "text" | "destructive";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  iconOnly?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  iconOnly = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const classes = [
    "ds-button",
    `ds-button--${variant}`,
    iconOnly ? "ds-button--icon" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? "Please wait" : children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function IconButton({ label, children, ...props }: IconButtonProps) {
  return (
    <Button variant="outline" iconOnly aria-label={label} {...props}>
      {children}
    </Button>
  );
}
