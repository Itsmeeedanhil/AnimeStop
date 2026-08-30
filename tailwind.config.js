/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#121414',
        surface: '#1c1f1f',
        'surface-highlight': '#252929',
        border: 'rgba(255, 233, 176, 0.1)',
        gold: {
          light: '#fff4d6',
          DEFAULT: '#ffe9b0',
          dark: '#b39855',
        },
      },
      fontFamily: {
        headline: ['"Bodoni Moda"', 'serif'],
        sans: ['"Hanken Grotesk"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

