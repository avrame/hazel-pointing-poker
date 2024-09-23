import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Avenir Next", Nunito, sans-serif, Arial'],
      }
    },
  },
  plugins: [],
} satisfies Config;
