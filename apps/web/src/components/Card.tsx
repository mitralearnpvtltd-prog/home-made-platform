import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="ds-card">
      {title ? <h3 className="ds-card__title">{title}</h3> : null}
      {children}
    </section>
  );
}
