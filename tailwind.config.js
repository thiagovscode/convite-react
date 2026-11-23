/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: {
          deep: '#1A100B',
          DEFAULT: '#261811',
          medium: '#3D271D',
          light: '#543D30',
        },
        taupe: {
          dark: '#523D32',
          DEFAULT: '#6B5A4D',
          light: '#8C7A6B',
          muted: '#A8988B',
        },
        champagne: {
          light: '#FAF7F2',
          DEFAULT: '#F1EAE0',
          dark: '#A88F72',
        },
        gold: {
          light: '#E8DDD0',
          DEFAULT: '#D8CDC0',
          dark: '#8A6A4E',
          accent: '#C9A84C',
        },
        paper: {
          offWhite: '#F8F4EC',
          warm: '#FAF7F2',
          cream: '#F1EAE0',
          creamDark: '#E8DDD0',
        },
        border: {
          subtle: '#E8DFD5',
          DEFAULT: '#D8CDC0',
          strong: '#B8A594',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Great Vibes"', 'cursive'],
        display: ['"Cinzel"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'editorial': '0 4px 30px -8px rgba(38, 24, 17, 0.06)',
        'editorial-lg': '0 16px 48px -12px rgba(38, 24, 17, 0.14)',
        'editorial-card': '0 2px 14px -4px rgba(38, 24, 17, 0.05)',
      },
    },
  },
  plugins: [],
}

