import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9", // Sky blue
          600: "#0284c7",
          900: "#0c4a6e", // Dark enterprise blue
        }
      },
    },
  },
  plugins: [],
};
export default config;
