/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nouryon: {
          blue:    '#1A4780',
          green:   '#1EA03C',
          teal:    '#00ABA9',
          purple:  '#660066',
          red:     '#BE0032',
          orange:  '#FF5300',
          grey:    '#575756',
        },
        surface: {
          page:  '#F8F9FA',
          card:  '#FFFFFF',
          muted: '#ECECEC',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong:  '#9CA3AF',
        }
      },
      fontFamily: {
        sans: ['Arial', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        lift:  '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        focus: '0 0 0 3px rgba(26,71,128,0.20)',
      },
      keyframes: {
        pulse_green: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(30,160,60,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(30,160,60,0)' },
        },
        pulse_amber: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(245,158,11,0)' },
        },
        breathe: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.55' },
        },
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
      },
      animation: {
        pulse_green: 'pulse_green 1.8s ease-in-out infinite',
        pulse_amber: 'pulse_amber 2.5s ease-in-out infinite',
        breathe:     'breathe 2.5s ease-in-out infinite',
        scanline:    'scanline 3s linear infinite',
        blink:       'blink 1.2s step-end infinite',
      },
    },
  },
  plugins: [],
}
