"use client";

export interface PillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/** Toggle / filter chip. */
export function Pill({ label, active = false, onClick }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface-2 text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
