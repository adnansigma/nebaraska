import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-blue': '#003366', // Your custom color
      },
    },
  },
  plugins: [],
};
export default config;