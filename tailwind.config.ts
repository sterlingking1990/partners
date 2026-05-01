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
        brand: {
          DEFAULT: "#10B981", // Emerald-500 for influencers
          foreground: "#FFFFFF",
          light: "#34D399",
          dark: "#059669",
        },
        background: "#F9FAFB",
        foreground: "#111827",
      },
    },
  },
  plugins: [],
};
export default config;
