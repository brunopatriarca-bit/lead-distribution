/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores customizadas das regiões (acessíveis via bg-region-go, etc.)
        region: {
          go:    '#8b5cf6',
          sul:   '#0ea5e9',
          none:  '#f97316',
          sp:    '#a855f7',
          rj:    '#eab308',
          mg:    '#22c55e',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
