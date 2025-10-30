module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#08415a'
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc'
        }
      },
      boxShadow: {
        subtle: '0 6px 18px rgba(2,8,23,0.08)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
