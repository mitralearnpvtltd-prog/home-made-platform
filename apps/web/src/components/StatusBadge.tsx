import type { ReactNode } from "react";

type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

type StatusBadgeProps = {
  tone?: StatusTone;
  children: ReactNode;
};

export function StatusBadge({ tone = "neutral", children }: StatusBadgeProps) {
  return <span className={`ds-badge ds-badge--${tone}`}>{children}</span>;
}
