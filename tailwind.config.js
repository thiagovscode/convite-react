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
        'rose-gold': '#8A6658',
        roseGold: {
          light: '#D8CDBB',
          DEFAULT: '#8A6658',
          dark: '#6B4638',
        },
        gold: {
          light: '#EAE3D5',
          DEFAULT: '#D8CDBB',
          dark: '#8A6658',
        },
        'dark-wine': '#4A2C24',
        wine: {
          DEFAULT: '#4A2C24',
          deep: '#3A211B',
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
