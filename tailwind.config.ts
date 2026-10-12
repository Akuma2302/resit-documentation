import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // chart series colours: money in / money out
        'series-in': '#2a78d6',
        'series-out': '#eb6834',
      },
    },
  },
  plugins: [],
}

export default config
