import { getServerAuthSession } from '@/lib/auth'
import Link from 'next/link'

export const metadata = {
  title: 'Contact | G.R.I.P.',
  description: 'Contact G.R.I.P. support and feedback.',
}

export default async function ContactPage() {
  const session = await getServerAuthSession()
  return (
    <div className="min-h-screen bg-background-primary">
      <header className="border-b border-border bg-background-secondary">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={session ? '/dashboard' : '/'} className="text-xl font-semibold text-primary">
            G.R.I.P.
          </Link>
          <Link
            href={session ? '/dashboard' : '/login'}
            className="text-sm text-primary hover:text-primary-hover"
          >
            {session ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Contact</h1>
        <div className="space-y-6 text-text-secondary">
          <p>Choose the right option:</p>
          <ul className="list-none space-y-3">
            <li>
              <Link href="/support" className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-background-secondary transition-colors text-primary font-medium">
                Create a support ticket
              </Link>
              <span className="block text-sm mt-1 pl-3">Submit a request; we reply to your email. Use this for domain setup, bugs, or questions.</span>
            </li>
            <li>
              <Link href="/docs" className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-background-secondary transition-colors text-primary font-medium">
                Documentation
              </Link>
              <span className="block text-sm mt-1 pl-3">Guides and getting started.</span>
            </li>
            <li>
              <Link href="/docs/api" className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-background-secondary transition-colors text-primary font-medium">
                API Reference
              </Link>
              <span className="block text-sm mt-1 pl-3">API endpoints, request/response examples, and auth.</span>
            </li>
            <li>
              <a
                href="https://github.com/GRIP-organization/GRIP/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-background-secondary transition-colors text-primary font-medium"
              >
                Open an issue on GitHub
              </a>
              <span className="block text-sm mt-1 pl-3">Bug reports and feature requests for the G.R.I.P. project.</span>
            </li>
          </ul>
          <p className="mt-6">
            <Link href="/privacy" className="text-primary hover:underline">Privacy</Link> ·{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
          </p>
        </div>
        <div className="mt-8">
          <Link href={session ? '/dashboard' : '/'} className="text-primary hover:text-primary-hover">
            ← Back
          </Link>
        </div>
      </main>
    </div>
  )
}
