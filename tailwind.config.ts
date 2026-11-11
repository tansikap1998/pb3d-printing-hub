import type { Config } from 'tailwindcss'

// Every colour comes from a CSS variable (see app/globals.css) so the same class
// works in both dark and light mode. Values are "R G B" triplets, which keeps
// opacity modifiers like `text-foreground/40` or `bg-foreground/[0.03]` working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: v('background'),
        foreground: v('foreground'),
        card: v('card'),
        muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
        border: v('border'),
        accent: v('accent'),
        warning: v('warning'),
        success: v('success'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'Prompt', 'system-ui', 'sans-serif'],
        header: ['Anton', 'Prompt', 'Noto Sans Thai', 'sans-serif'],
        serif: ['Cormorant Garamond', 'serif'],
      },
      fontSize: {
        // smallest readable size; replaces the old fixed 8–10px labels
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-33.333%)' } },
        'marquee-vertical': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(-50%)' } },
      },
      animation: {
        marquee: 'marquee 60s linear infinite',
        'marquee-vertical': 'marquee-vertical 40s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
