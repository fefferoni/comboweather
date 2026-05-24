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
          muted: "#64748b",
          inverse: "#f8fafc",
        },
        surface: {
          DEFAULT: "#ffffff",
          alt: "#f1f5f9",
          dark: "#0b1220",
          darkAlt: "#111a2e",
        },
      },
    },
  },
  plugins: [],
};
