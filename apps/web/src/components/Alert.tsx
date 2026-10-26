import type { ReactNode } from "react";

type AlertTone = "error" | "success";

type AlertProps = {
  tone?: AlertTone;
  children: ReactNode;
};

export function Alert({ tone = "error", children }: AlertProps) {
  return (
    <div className={`ds-alert ds-alert--${tone}`} role="status">
      {children}
    </div>
  );
}
