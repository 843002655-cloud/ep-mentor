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
        // EP Mentor — 专业医疗白色主题
        "ep-bg": "#F5F8FC",
        "ep-card": "#FFFFFF",
        "ep-primary": "#1B4F8A",
        "ep-primary-hover": "#154070",
        "ep-primary-light": "#EBF2FA",
        "ep-secondary": "#4C3D9E",
        "ep-text": "#3D5166",
        "ep-title": "#1A2332",
        "ep-muted": "#6B7F96",
        "ep-placeholder": "#8FA0B4",
        "ep-border": "#DDE5EE",
        "ep-divider": "#E8ECF0",
        "ep-input-border": "#C5D3E0",
        "ep-button-secondary-text": "#4B6080",
        // Category colors
        svt: "#1B4F8A",
        vt: "#9B2C2C",
        af: "#854F0B",
        afl: "#4C3D9E",
        // Difficulty colors
        "diff-basic": "#0F6E56",
        "diff-intermediate": "#854F0B",
        "diff-advanced": "#9B2C2C",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", "sans-serif"],
        serif: ["PingFang SC", "STSong", "SimSun", "Noto Serif CJK SC", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
