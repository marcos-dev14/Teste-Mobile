import { colors } from "./src/styles/theme/colors"

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['NotoSans-Regular', 'sans-serif'],
        bold: ['NotoSans-Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
}