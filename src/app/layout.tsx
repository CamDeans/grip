import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from '@/components/providers/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'G.R.I.P - Guided Real-time Intellectual Partner',
  description: 'Accelerate your development workflow with AI-powered project analysis and insights.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

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
