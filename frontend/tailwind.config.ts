import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Saffron/brass is the dominant accent; kept under `brand` so existing
        // utilities (text-brand, ring-brand, focus:border-brand) pick it up.
        brand: {
          DEFAULT: "var(--saffron)",
          dark: "var(--saffron-deep)",
        },
        teal: "var(--teal)",
        whatsapp: "var(--whatsapp)",
        surface: "var(--surface)",
        ink: "var(--bg)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
