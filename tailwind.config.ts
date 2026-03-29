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
        felt: {
          DEFAULT: "#0d5c2e",
          dark: "#0a4a24",
          light: "#117a3e",
        },
        gold: {
          DEFAULT: "#d4a843",
          light: "#e8c36a",
          dark: "#b08930",
        },
      },
      animation: {
        "card-deal": "cardDeal 0.4s ease-out",
        "card-flip": "cardFlip 0.6s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        cardDeal: {
          "0%": { transform: "translateY(-100px) rotate(-10deg)", opacity: "0" },
          "100%": { transform: "translateY(0) rotate(0)", opacity: "1" },
        },
        cardFlip: {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(212, 168, 67, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(212, 168, 67, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
