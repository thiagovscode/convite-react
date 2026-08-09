/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        champagne: {
          light: '#F3EFE6',
          DEFAULT: '#EAE3D5',
          dark: '#D8CDBB',
        },
        'rose-gold': '#B8AA95',
        roseGold: {
          light: '#D8CDBB',
          DEFAULT: '#B8AA95',
          dark: '#5F574D',
        },
        gold: {
          light: '#EAE3D5',
          DEFAULT: '#D8CDBB',
          dark: '#B8AA95',
        },
        'dark-wine': '#5F574D',
        wine: {
          DEFAULT: '#5F574D',
          deep: '#2F2B27',
        },
        blush: {
          light: '#F3EFE6',
          DEFAULT: '#EAE3D5',
        },
        'off-white': '#F8F5EE',
        paper: {
          offWhite: '#F8F5EE',
          cream: '#F3EFE6',
          creamDark: '#EAE3D5',
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
