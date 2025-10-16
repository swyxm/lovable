/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.{html,js,ts,jsx,tsx}",
    "./public/popup.html",
  ],
  theme: {
    extend: {
      colors: {
        lovable: {
          primary: '#2563eb', // Nice blue
          secondary: '#1d4ed8', // Darker blue
          accent: '#3b82f6', // Light blue
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textLight: '#475569',
        }
      }
    },
  },
  plugins: [],
}
