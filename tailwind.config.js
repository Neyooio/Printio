/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      spacing: {
        84: "21rem",
      },
      colors: {
        surface: {
          DEFAULT: "#1a1a2e",
          light: "#222240",
          lighter: "#2a2a4a",
        },
        accent: {
          DEFAULT: "#6366f1",
          light: "#818cf8",
          dark: "#4f46e5",
        },
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
      animation: {
        "progress-ring": "progress-ring 1.5s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
      },
      keyframes: {
        "progress-ring": {
          "0%": { "stroke-dashoffset": "283" },
          "50%": { "stroke-dashoffset": "75" },
          "100%": { "stroke-dashoffset": "283" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
