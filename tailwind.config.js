/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        // Moonlight Palette
        background: {
          light: '#F8FAFC', // Slate 50
          dark: '#0F172A',  // Slate 900
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.7)',
          dark: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity
        },
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Indigo 500 - Main Brand Color
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        accent: {
          light: '#FEF3C7', // Amber 100
          DEFAULT: '#FBBF24', // Amber 400 - Moonlight Glow
          dark: '#B45309',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 15px -3px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
      }
    },
  },
  plugins: [],
}
