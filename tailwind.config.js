/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        taupe: {
          dark: '#68564A',
          DEFAULT: '#8F7968',
          light: '#A18D7C',
        },
        champagne: {
          light: '#F1EAE0',
          DEFAULT: '#E8DDD0',
          dark: '#A88F72',
        },
        gold: {
          light: '#E8DDD0',
          DEFAULT: '#D8CDC0',
          dark: '#A88F72',
        },
        paper: {
          offWhite: '#F8F4EC',
          cream: '#F1EAE0',
          creamDark: '#E8DDD0',
        },
        border: {
          subtle: '#D8CDC0',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Great Vibes"', 'cursive'],
        display: ['"Cinzel"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
