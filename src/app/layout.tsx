import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from '@/components/providers/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'G.R.I.P. - GitHub Repo-Analysis Intellectual Partner',
  description: 'Accelerate your development workflow with AI-powered project analysis and insights.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (err) {
    // JWT_SESSION_ERROR "decryption operation failed" when NEXTAUTH_SECRET changed or cookie is invalid.
    // Treat as no session so the app still renders; user can sign in again.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RootLayout] Session error (e.g. JWT decryption failed):', err instanceof Error ? err.message : err)
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers session={session}>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow pb-16 sm:pb-12 min-w-0 overflow-x-hidden">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
