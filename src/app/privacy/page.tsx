import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | G.R.I.P.',
  description: 'G.R.I.P. privacy policy and data handling practices.',
}

export default async function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-text-primary mb-6">Privacy Policy</h1>
        <p className="text-text-secondary mb-4">
          Last updated: {new Date().toLocaleDateString('en-US')}.
        </p>
        <div className="prose prose-invert max-w-none space-y-4 text-text-secondary">
          <p>
            G.R.I.P. (&quot;we&quot;) respects your privacy. This policy describes how we collect, use,
            and protect your information when you use our application.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Information we collect</h2>
          <p>
            We collect account information (email, name when you register or sign in with GitHub),
            project and chat data you create in the app, and usage data necessary to operate the
            service.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">How we use it</h2>
          <p>
            We use your data to provide the G.R.I.P. development workflow, AI-assisted chat,
            project management, and to improve our services.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Data security</h2>
          <p>
            We use industry-standard practices to secure your data. Authentication is handled via
            NextAuth; we do not store your GitHub or credential passwords in plain text.
          </p>
          <h2 className="text-xl font-semibold text-text-primary mt-6">Contact</h2>
          <p>
            For privacy-related questions, visit our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
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
