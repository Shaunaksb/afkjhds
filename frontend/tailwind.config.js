/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        trading: {
          bg: "#0B0F17",
          card: "#111827",
          border: "#1F2937",
          accent: "#06B6D4",
          actual: "#10B981", // Emerald for actuals
          forecast: "#38BDF8", // Sky blue for forecast
          deficit: "#EF4444", // Red for over-forecast shortfall
          surplus: "#34D399", // Green for surplus
        }
      }
    },
  },
  plugins: [],
}
