/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lovable: {
          primary: '#4CAF50',
          secondary: '#2196F3',
          accent: '#FF9800',
          background: '#F5F5F5',
          surface: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
