import type { Config } from "tailwindcss";

/**
 * Moonfare design tokens — the single source of truth for the component library.
 * Hex values are the authoritative palette from the project CLAUDE.md and mirror
 * the CSS variables the live `.dc.html` dashboard renders with. Encoded as a
 * Tailwind preset so every component styles with utilities (bg-*, text-*, fill-*,
 * stroke-*, border-*) and the design-sync agent gets one enumerable family table.
 */
export const MOONFARE_COLORS = {
  // Brand + neutrals
  brand: "#2C2DFE",
  "brand-2": "#5B5CFF",
  indigo: "#1417C2",
  mint: "#2D8F6F",
  cream: "#F4EFE2",
  warm: "#FAF6EC",
  paper: "#FAFAF8",
  ink: "#0E0E0E",
  line: "#E5E2DC",
  muted: "#6B6B6B",
  navy: "#20243A",
  // Semantic over/under (always pair with ▲/▼ + sign)
  over: "#2D8F6F",
  under: "#1417C2",
  // Surfaces
  surface: "#FFFFFF",
  "surface-2": "#FAF6EC",
  "surface-hero": "#F4EFE2",
  // Comparator neutrals
  peer: "#7A6A55",
  platform: "#B5A98F",
  model: "#3E5A5C",
  // Categorical chart ramp (fixed strategy→color map; matches globals.css --data-*)
  "data-1": "#2C2DFE",
  "data-2": "#5B5CFF",
  "data-3": "#8C8DFF",
  "data-4": "#3E5A5C",
  "data-5": "#2D8F6F",
  "data-6": "#7AB89E",
  "data-7": "#7A6A55",
  "data-8": "#C8392F",
  "data-9": "#B5A98F",
  "data-10": "#1417C2",
} as const;

const moonfarePreset: Partial<Config> = {
  theme: {
    extend: {
      colors: { ...MOONFARE_COLORS },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
};

export default moonfarePreset;
