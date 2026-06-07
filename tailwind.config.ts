import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN.md のカラーパレット
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
        },
        secondary: "#20970B",
        neutral: "#9C9C9C",
        background: "#FAFAFA",
        surface: "#FFFFFF",
        "text-primary": "#0A0A0A",
        "text-secondary": "#6B6B6B",
        border: "#E8E8EC",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        // 緊急（台風）モード用
        emergency: {
          bg: "#FFF7ED",
          accent: "#EA580C",
          banner: "#B91C1C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        // SPEC.md 9.2 に従い本文16px以上、ボタン18px以上
        base: ["16px", { lineHeight: "1.6" }],
        button: ["18px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        chip: "4px",
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(0,0,0,0.02)",
        "card-hover": "0 8px 30px rgba(0,0,0,0.08)",
        primary: "0 4px 12px rgba(99,102,241,0.35)",
        focus: "0 0 0 3px rgba(99,102,241,0.12)",
      },
      minHeight: {
        tap: "44px",
        cta: "56px",
      },
    },
  },
  plugins: [],
};

export default config;
