/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FFE500', // Vibrant yellow from logo
          red: '#EF4444',    // Accent red from chicken comb
          dark: '#111827',   // Near black for high contrast text
          gray: '#F4F4F5',   // SAP light gray background
        }
      }
    },
  },
  plugins: [],
}