export type BadgeTone = "neutral" | "over" | "under" | "brand";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

// Literal class strings (one per tone) so Tailwind's content scan keeps them.
const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted",
  over: "bg-over/10 text-over",
  under: "bg-under/10 text-under",
  brand: "bg-brand/10 text-brand",
};

/** Small uppercase status / asset-class label. */
export function Badge({ label, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${BADGE_TONE[tone]}`}
    >
      {label}
    </span>
  );
}
