import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#070a12", 900: "#0b0f1a", 850: "#0f1524", 800: "#141b2e", 700: "#1c2540" },
        gold: { 400: "#ffd873", 500: "#f5b301", 600: "#d99400" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(245,179,1,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
