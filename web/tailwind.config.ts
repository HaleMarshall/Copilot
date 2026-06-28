import type { Config } from "tailwindcss";

// Moonfare palette — the authoritative tokens from the design system.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        over: "#2D8F6F",
        under: "#1417C2",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
