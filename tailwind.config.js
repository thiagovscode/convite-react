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
          light: '#FBF1E2',
          DEFAULT: '#F7E7CE',
          dark: '#E8D4AF',
        },
        'rose-gold': '#B76E79',
        roseGold: {
          light: '#D4A0AA',
          DEFAULT: '#B76E79',
          dark: '#8A4F59',
        },
        gold: {
          light: '#DFC17A',
          DEFAULT: '#C9A84C',
          dark: '#9E7A2F',
        },
        'dark-wine': '#6B2D3E',
        wine: {
          DEFAULT: '#6B2D3E',
          deep: '#3D1525',
        },
        blush: {
          light: '#F2D4D7',
          DEFAULT: '#E8C0C5',
        },
        'off-white': '#FAF7F2',
        paper: {
          offWhite: '#FAF7F2',
          cream: '#F5F0E8',
          creamDark: '#EDE7DA',
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
