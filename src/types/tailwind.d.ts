import { Config } from 'tailwindcss'

declare module 'tailwindcss/tailwind-config' {
  interface TailwindConfig extends Config {
    content: string[]
    darkMode: 'class' | 'media'
    theme: {
      extend: {
        colors: {
          'background-primary': string
          'background-secondary': string
          'background-tertiary': string
          'text-primary': string
          'text-secondary': string
          'text-muted': string
          'border-default': string
          'border-hover': string
          'primary-500': string
          'primary-600': string
          'accent-purple': string
        }
        animation: {
          'fade-in': string
        }
        keyframes: {
          fadeIn: {
            '0%': { opacity: string; transform: string }
            '100%': { opacity: string; transform: string }
          }
        }
      }
    }
  }
} 