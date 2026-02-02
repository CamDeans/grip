import { getServerAuthSession } from '@/lib/auth'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | G.R.I.P.',
  description: 'G.R.I.P. terms of service and use.',
}

export default async function TermsPage() {
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
        <h1 className="text-3xl font-bold text-text-primary mb-6">Terms of Service</h1>
        <p className="text-text-secondary mb-4">
          Last updated: {new Date().toLocaleDateString('en-US')}.
        </p>
        <div className="prose prose-invert max-w-none space-y-4 text-text-secondary">
          <p>
            By using G.R.I.P., you agree to these terms. If you do not agree, do not use the
            service.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Use of the service</h2>
          <p>
            You may use G.R.I.P. for development workflows, AI-assisted coding, and project
            management in accordance with these terms and applicable laws.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Acceptable use</h2>
          <p>
            You must not use the service to violate any laws, infringe others&apos; rights, or
            attempt to gain unauthorized access to systems or data.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Disclaimer</h2>
          <p>
            The service is provided &quot;as is.&quot; We do not guarantee uninterrupted or error-free
            operation. AI-generated content should be reviewed before use.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Contact</h2>
          <p>
            For questions about these terms, see our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
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
