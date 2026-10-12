import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shell colours: sidebar, top bar and panel headers
        navy: { 700: '#16306b', 800: '#0f2557', 900: '#0a1a44' },
        brand: { 50: '#eaf2fd', 600: '#1565d8', 700: '#0f4fb0' },
        // chart series colours: money in / money out
        'series-in': '#2a78d6',
        'series-out': '#eb6834',
      },
    },
  },
  plugins: [],
}

export default config
