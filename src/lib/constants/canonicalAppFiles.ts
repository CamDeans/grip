/**
 * Canonical Next.js App Router files used when AI output is rejected (e.g. next/head in app dir)
 * or when fix-build applies deterministic fixes. Shared by fix-build and files/generate, retry-failed.
 */

/** Known-good root layout: Metadata API, children in signature, globals.css import so styling applies. Use when layout.tsx is rejected for next/head. */
export const CANONICAL_ROOT_LAYOUT = `import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "App",
  description: "GRIP project",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`

/** True if path is app/layout or src/app/layout (any tsx/ts/jsx/js). */
export function isRootLayoutPath(path: string): boolean {
  const n = path.replace(/^\/+/, '').replace(/\\/g, '/')
  return /^(app|src\/app)\/layout\.(tsx|ts|jsx|js)$/i.test(n)
}

/** Known-good globals.css: Tailwind directives + :root/body. Use so StackBlitz/Next never get JS/TS in a .css file. */
export const CANONICAL_GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: 0 0% 0%;
  --background: 0 0% 100%;
}

body {
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font-family: system-ui, sans-serif;
}
`

/** True if path is app/globals.css or src/app/globals.css. */
export function isGlobalsCssPath(path: string): boolean {
  const n = path.replace(/^\/+/, '').replace(/\\/g, '/')
  return /^(app|src\/app)\/globals\.css$/i.test(n)
}

/** Minimal App Router page (Metadata API only). Use when fix-build finds next/head in app-dir page.tsx. */
export const CANONICAL_APP_PAGE = `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page',
  description: 'GRIP project page',
}

export default function Page() {
  return <main>Content</main>
}
`
