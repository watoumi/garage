import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand: electric blue accent. `brand` is kept so existing utilities
        // (text-brand, ring-brand, focus:border-brand) adopt the new accent.
        brand: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent-deep)",
        },
        accent: {
          DEFAULT: "#2563EB",
          deep: "#1D4ED8",
          soft: "#DBEAFE",
        },
        navy: "#0F172A",
        carbon: "#111827",
        success: { DEFAULT: "#10B981", deep: "#059669" },
        warning: "#F59E0B",
        danger: "#EF4444",
        teal: "var(--teal)",
        whatsapp: "var(--whatsapp)",
        surface: { DEFAULT: "var(--surface)", muted: "var(--surface-2)" },
        ink: "var(--bg)",
        hair: "var(--border)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 18px 40px -28px rgba(15,23,42,0.28)",
        premium: "0 24px 60px -28px rgba(15,23,42,0.40)",
        glow: "0 12px 30px -10px rgba(37,99,235,0.45)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
        "fade-in": "fade-in 0.4s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
