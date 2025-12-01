import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Checks src folder (if you have it)
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Checks app folder (based on your screenshot)
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  // THIS IS THE IMPORTANT PART FOR THE ERROR:
  plugins: [require('@tailwindcss/typography')],
};
export default config;