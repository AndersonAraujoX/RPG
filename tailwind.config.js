/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./src/**/*.js",
    "./legado/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        rpg: {
          black: '#0B0C10',
          cyan: '#66FCF1',
          slate: '#1F2833',
          silver: '#C5C6C7'
        }
      }
    }
  },
  plugins: [],
}
