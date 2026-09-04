/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // use class strategy for dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionDuration: {
        250: '250ms' // custom 250ms duration so duration-250 is valid
      },
      colors: {
        leaf: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50: '#fefef9',
          100: '#fefcf3',
          200: '#fef7e0',
          300: '#feefcc',
          400: '#fddf99',
          500: '#fcc419',
          600: '#d69e2e',
          700: '#b7791f',
          800: '#975a16',
          900: '#744210',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
