import type { Config } from "tailwindcss";
import moonfarePreset from "./src/components/moonfare/moonfare-preset";

// The Moonfare token contract lives in the preset (single source of truth,
// also consumed by design-sync). This config only wires content + the preset.
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  presets: [moonfarePreset as Config],
  plugins: [],
};

export default config;
