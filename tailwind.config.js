/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Light tokens (defaults) ──────────────────────────────────────────
        // These match the CSS custom properties from src/styles/global.scss.
        // Dark-mode overrides are applied via the `dark:` prefix at the
        // component level (e.g. `dark:bg-surface-dark`).
        bg: '#ffffff',
        surface: '#f4f3ec',
        'surface-hover': 'rgba(0,0,0,0.04)',
        'app-text': '#1a1a1a',
        'text-muted': '#6b6375',
        accent: '#646cff',
        'accent-contrast': '#ffffff',
        border: '#e5e4e7',
        overlay: 'rgba(0,0,0,0.5)',
        shadow: 'rgba(0,0,0,0.1)',

        success: '#16a34a',
        'success-bg': 'rgba(22,163,74,0.1)',
        'success-border': 'rgba(22,163,74,0.3)',

        warning: '#d97706',
        'warning-bg': 'rgba(217,119,6,0.1)',
        'warning-border': 'rgba(217,119,6,0.3)',

        error: '#d92d20',
        'error-bg': 'rgba(217,45,32,0.1)',
        'error-border': 'rgba(217,45,32,0.3)',

        info: '#2563eb',
        'info-bg': 'rgba(37,99,235,0.1)',
        'info-border': 'rgba(37,99,235,0.3)',

        // ─── Dark token overrides ─────────────────────────────────────────────
        'bg-dark': '#16171d',
        'surface-dark': '#1f2028',
        'surface-hover-dark': 'rgba(255,255,255,0.06)',
        'text-dark': '#f3f4f6',
        'text-muted-dark': '#9ca3af',
        'accent-dark': '#818cf8',
        'accent-contrast-dark': '#16171d',
        'border-dark': '#2e303a',
        'overlay-dark': 'rgba(0,0,0,0.7)',
        'shadow-dark': 'rgba(0,0,0,0.4)',

        'success-dark': '#4ade80',
        'success-bg-dark': 'rgba(74,222,128,0.12)',
        'success-border-dark': 'rgba(74,222,128,0.35)',

        'warning-dark': '#fbbf24',
        'warning-bg-dark': 'rgba(251,191,36,0.12)',
        'warning-border-dark': 'rgba(251,191,36,0.35)',

        'error-dark': '#f87171',
        'error-bg-dark': 'rgba(248,113,113,0.12)',
        'error-border-dark': 'rgba(248,113,113,0.35)',

        'info-dark': '#60a5fa',
        'info-bg-dark': 'rgba(96,165,250,0.12)',
        'info-border-dark': 'rgba(96,165,250,0.35)',
      },
      fontFamily: {
        sans: ['System', 'ui-sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      spacing: {
        unit: '8px',
      },
      screens: {
        md: '768px',
      },
      width: {
        sidebar: '220px',
      },
    },
  },
  plugins: [],
}
