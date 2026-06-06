import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // EP Mentor dark medical theme
        "ep-bg": "#0a0e1a",
        "ep-card": "#0d1b2e",
        "ep-primary": "#6366f1",
        "ep-secondary": "#8b5cf6",
        "ep-text": "#e2e8f0",
        "ep-muted": "#94a3b8",
        // Category colors
        svt: "#6366f1",
        vt: "#ec4899",
        af: "#f59e0b",
        wpw: "#8b5cf6",
        // Difficulty colors
        "diff-basic": "#22c55e",
        "diff-intermediate": "#f59e0b",
        "diff-advanced": "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-sc)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
