/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Nordic minimal palette — light/dark variants picked from
        // Tailwind's slate/sky scales for a cool, restrained look.
        sky: {
          50: "#f0f9ff",
          500: "#0ea5e9",
          600: "#0284c7",
          900: "#0c4a6e",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#334155",
          // muted reads at ~3.5:1 on the dark-mode card surface (#1e293b),
          // below WCAG AA — pair it with `dark:text-ink-mutedDark` (slate-400,
          // ~5.5:1) for any text that's expected to be subtle but legible.
          muted: "#64748b",
          mutedDark: "#94a3b8",
          inverse: "#f8fafc",
        },
        surface: {
          DEFAULT: "#ffffff",
          alt: "#f1f5f9",
          // Dark theme: true black body so OLED iPhones get the deepest
          // contrast (and free pixel-power savings), card surfaces lifted
          // to slate-800 for clear card/body separation. Earlier passes
          // used #0b1220 / #111a2e (too pale) then #020617 / #1e293b
          // (better but the body still read as muddy navy on the device).
          dark: "#000000",
          darkAlt: "#1e293b",
        },
      },
    },
  },
  plugins: [],
};
