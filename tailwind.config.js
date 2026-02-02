/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: {
          DEFAULT: "var(--border)",
          hover: "var(--border-hover)",
        },
        input: "var(--border)",
        ring: "var(--primary-focus)",
        background: {
          DEFAULT: "var(--background-primary)",
          primary: "var(--background-primary)",
          secondary: "var(--background-secondary)",
          tertiary: "var(--background-tertiary)",
        },
        foreground: "var(--text-primary)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--background-secondary)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
        },
        muted: {
          DEFAULT: "var(--background-tertiary)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          blue: "var(--accent-blue)",
          teal: "var(--accent-teal)",
          amber: "var(--accent-amber)",
        },
        popover: {
          DEFAULT: "var(--background-primary)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--background-secondary)",
          foreground: "var(--text-primary)",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--primary) 0%, var(--accent-blue) 100%)',
        'gradient-primary-hover': 'linear-gradient(135deg, var(--primary-hover) 0%, var(--accent-blue) 100%)',
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        inner: "var(--shadow-inner)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
}
