/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        heading: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        dark: {
          bg: '#111110',
          surface: '#1A1A18',
          elevated: '#212120',
          border: '#2A2A28',
          hover: '#212120',
          text: '#EDEDEA',
          secondary: '#8A8A82',
          muted: '#5A5A54',
        },
        parchment: {
          50: '#F8F8F6',
          100: '#FAFAF8',
          200: '#E8E8E4',
        },
        ink: {
          DEFAULT: '#1A1A18',
          light: '#6B6B64',
          muted: '#A8A8A0',
        },
        sage: {
          DEFAULT: '#2D6A4F',
          light: '#236349',
          pale: '#E8F5EE',
          glow: 'rgba(45,106,79,0.15)',
          dark: '#4ADE80',
          darkHover: '#22C55E',
          darkPale: 'rgba(74,222,128,0.1)',
        },
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        md: '0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        lg: '0 8px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
        note: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        'note-hover': '0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        panel: '0 8px 32px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)',
        glass: '0 8px 32px rgba(17,17,16,0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.8s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-16px)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xl: '24px',
      },
    },
  },
  plugins: [],
}
