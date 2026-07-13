import type { Config } from 'tailwindcss';

/**
 * Warm, friendly, non-partisan civic palette. Deliberately avoids party colours
 * as dominant hues. Two ranking axes use distinct, colourblind-safe families:
 * teal = Verified Performance, amber = Public Rating.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#20242e', soft: '#4a5160', faint: '#7c8496' },
        paper: { DEFAULT: '#ffffff', soft: '#faf7f2', sink: '#f3eee6' },
        line: '#ece7df',
        brand: { DEFAULT: '#4f46e5', ink: '#3730a3', soft: '#eef1ff' },
        accent: { DEFAULT: '#f97316', ink: '#c2410c', soft: '#fff3e9' },
        perf: { DEFAULT: '#0d9488', ink: '#0f766e', soft: '#e6f5f3' }, // verified performance
        rating: { DEFAULT: '#f59e0b', ink: '#b45309', soft: '#fef4e2' }, // public rating
        good: '#16a34a',
        warn: '#d97706',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // slightly larger, friendlier scale
        base: ['1.0625rem', { lineHeight: '1.6' }],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(32,36,46,0.04), 0 8px 24px rgba(32,36,46,0.06)',
        lift: '0 2px 4px rgba(32,36,46,0.05), 0 16px 40px rgba(32,36,46,0.10)',
      },
      maxWidth: { content: '75rem' },
    },
  },
  plugins: [],
};

export default config;
