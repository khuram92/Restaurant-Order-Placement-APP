/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4e5c4a", // olive
          dark: "#3b4638",
          light: "#6f7d6a",
          soft: "#e8ebe6",
        },
        mist: {
          DEFAULT: "#e0e1df", // light grey
          dark: "#c9cbc6",
          light: "#f0f1ef",
        },
      },
    },
  },
  plugins: [],
};