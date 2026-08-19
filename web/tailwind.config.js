/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f6f8fb',
        'on-background': '#172033',
        surface: '#ffffff',
        'surface-soft': '#eaf2ff',
        'surface-muted': '#e9f8ef',
        outline: '#dbe4f0',
        primary: {
          DEFAULT: '#2563eb',
          strong: '#1d4ed8',
          soft: '#eaf2ff',
        },
        success: {
          DEFAULT: '#16a34a',
          soft: '#e9f8ef',
        },
        dark: {
          surface: '#0f172a',
          panel: '#111827',
          'on-surface': '#ffffff',
          'on-surface-muted': '#cbd5e1',
        },
      },
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
        sans: ['Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        'card-lg': '24px',
        panel: '28px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 18px 44px rgba(15, 23, 42, 0.08)',
        'panel-dark': '0 22px 54px rgba(15, 23, 42, 0.24)',
        support: '0 22px 52px rgba(37, 99, 235, 0.20)',
      },
      maxWidth: {
        container: '1180px',
      },
      keyframes: {
        dashFlow: {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-360' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
      },
      animation: {
        'dash-flow': 'dashFlow 18s linear infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
