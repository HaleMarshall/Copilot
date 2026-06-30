"use client";
import { ReactNode } from "react";

export interface CardProps {
  /** Serif card title. */
  title?: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** Optional top-right call-to-action. */
  cta?: { label: string; onClick?: () => void };
  children?: ReactNode;
  className?: string;
}

/** Surface container with the Moonfare card chrome (border, rounded, padding). */
export function Card({ title, eyebrow, cta, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {(eyebrow || title || cta) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
            )}
          </div>
          {cta && (
            <button
              onClick={cta.onClick}
              className="shrink-0 text-[13px] font-semibold text-brand hover:underline"
            >
              {cta.label}
            </button>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
