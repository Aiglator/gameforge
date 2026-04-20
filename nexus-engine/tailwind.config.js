/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface Tiering
        'surface-lowest':        '#040912',
        'surface-low':           '#070e1d',
        'surface':               '#0c1322',
        'surface-container-low': '#0f1624',   // ← used by panels (was missing)
        'surface-container':     '#141b2b',
        'surface-high':          '#1c2538',
        'surface-highest':       '#232d42',
        'surface-bright':        '#2e3a52',
        // Accent
        'accent':       '#3b82f6',
        'accent-hover': '#4d8eff',
        // Semantic
        'primary':            '#adc6ff',
        'secondary':          '#4edea3',
        'tertiary':           '#a4c9ff',
        'error':              '#f87171',
        'on-surface':         '#dce2f8',
        'on-surface-variant': '#8b98b4',
        'muted':              '#64748b',
        'ghost':              '#424754',
        'secondary-container': '#00a572',
        'on-secondary':       '#003824',
        'tertiary-container': '#4c93e7',
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        lg: '0px',
        xl: '0px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
