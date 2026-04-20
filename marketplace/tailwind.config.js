/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        surface: '#0d1117',
        'surface-container': '#161b22',
        'surface-container-low': '#111620',
        'surface-high': '#1c2333',
        'surface-highest': '#21262d',
        'on-surface': '#e6edf3',
        'on-surface-variant': '#8b949e',
        accent: '#58a6ff',
        secondary: '#3fb950',
        primary: '#6e7fd2',
      },
      borderRadius: { DEFAULT: '0px' },
      fontFamily: { mono: ['JetBrains Mono', 'monospace'] },
    },
  },
  plugins: [],
}
