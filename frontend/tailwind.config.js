/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'polar-dark': '#0a0e1a',
        'polar-dark-lighter': '#141a2e',
        'polar-blue': '#0ea5e9',
        'polar-blue-light': '#38bdf8',
        'ice-white': '#f8fafc',
        'alert-critical': '#dc2626',
        'alert-high': '#f59e0b',
        'alert-medium': '#eab308',
        'alert-low': '#3b82f6',
        'measured': '#10b981',
        'simulated': '#8b5cf6',
        'manual': '#6b7280',
        'mission-control': {
          '50': '#f0f9ff',
          '100': '#e0f2fe',
          '200': '#bae6fd',
          '300': '#7dd3fc',
          '400': '#38bdf8',
          '500': '#0ea5e9',
          '600': '#0284c7',
          '700': '#0369a1',
          '800': '#075985',
          '900': '#0c4a6e',
        }
      },
      fontFamily: {
        'sans': ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
        'display': ['Space Grotesk', 'Inter', 'sans-serif'],
        'heading': ['Source Serif 4', 'Georgia', 'serif'],
      },
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'elevation-4': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-strong': '0 0 30px rgba(14, 165, 233, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-polar': 'linear-gradient(135deg, #0a0e1a 0%, #141a2e 100%)',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
