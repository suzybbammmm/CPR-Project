
/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Black Han Sans"', 'sans-serif'],
        body: ['"Noto Sans KR"', 'sans-serif'],
      },
      colors: {
        neon: {
          blue: '#00D4FF',
          green: '#00FF88',
          orange: '#FF6B35',
          purple: '#A855F7',
          yellow: '#FBBF24',
          cyan: '#22D3EE',
          pink: '#F472B6',
        },
        surface: {
          900: '#0B0E1A',
          800: '#111427',
          700: '#1A1E35',
          600: '#232842',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'spin-reverse': 'spinReverse 15s linear infinite',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        spinReverse: {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.85)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.2)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 255, 136, 0.2)',
        'neon-orange': '0 0 20px rgba(255, 107, 53, 0.5), 0 0 60px rgba(255, 107, 53, 0.2)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5), 0 0 60px rgba(168, 85, 247, 0.2)',
        'neon-yellow': '0 0 20px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.2)',
      },
    },
  },
  plugins: [],
}
