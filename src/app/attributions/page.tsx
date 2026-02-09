import { getServerAuthSession } from '@/lib/auth'
import Link from 'next/link'

export const metadata = {
  title: 'Attributions & Open Source | G.R.I.P.',
  description: 'G.R.I.P. attributions, open source acknowledgments, and GitHub code usage.',
}

const GITHUB_TOS = 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service'
const GITHUB_OPEN_SOURCE = 'https://docs.github.com/en/get-started/quickstart/github-glossary#open-source'
const GITHUB_ACCEPTABLE_USE = 'https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies'

export default async function AttributionsPage() {
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
        <h1 className="text-3xl font-bold text-text-primary mb-6">Attributions & Open Source</h1>
        <p className="text-text-secondary mb-4">
          Last updated: {new Date().toLocaleDateString('en-US')}.
        </p>
        <div className="prose prose-invert max-w-none space-y-4 text-text-secondary">
          <p>
            G.R.I.P. uses GitHub to search, reference, and optionally clone open-source repositories
            so you can build projects with the help of existing code and our AI. We respect the work
            of original creators and follow platform and legal best practices for code usage.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-6">GitHub &amp; code usage</h2>
          <p>
            When you use G.R.I.P. to create a project, you may select a GitHub repository as a
            starting point or reference. We comply with{' '}
            <a href={GITHUB_TOS} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              GitHub&apos;s Terms of Service
            </a>{' '}
            and{' '}
            <a href={GITHUB_ACCEPTABLE_USE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Acceptable Use Policies
            </a>. We do not claim ownership of any third-party code; original repositories and
            their authors retain their rights. We encourage proper attribution and compliance with
            each repository&apos;s license when you use or derive from open-source code.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-6">Homage to original creators</h2>
          <p>
            G.R.I.P. acknowledges and respects the open-source community. Code that originates from
            GitHub repositories you select or that we reference remains attributed to those
            repositories and their creators. This attributions page is part of our platform&apos;s
            commitment to transparency and to honoring the work of open-source contributors. We do
            not inject attribution files or notices into the projects you build and export; your
            exported project is yours. Compliance with the licenses of any repos you base your work on
            is your responsibility when you distribute or publish your project.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-6">Platform acknowledgments</h2>
          <p>
            G.R.I.P. relies on the following services and ecosystems. We are grateful to the
            people and organizations behind them:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>GitHub</strong> — Repository search, content access, and export. See{' '}
              <a href={GITHUB_TOS} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                GitHub Terms of Service
              </a>{' '}
              and{' '}
              <a href={GITHUB_OPEN_SOURCE} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                GitHub&apos;s open source resources
              </a>.
            </li>
            <li>
              <strong>Anthropic</strong> — AI models powering the G.R.I.P. assistant, used in accordance with Anthropic&apos;s terms and policies.
            </li>
            <li>
              The broader <strong>open-source community</strong> — Repositories and projects that users select or reference when building with G.R.I.P. We encourage users to respect each project&apos;s license and to credit creators when appropriate.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-text-primary mt-6">Your project exports</h2>
          <p>
            When you export, download, or deploy a project from G.R.I.P., we do not add attribution
            or license files into your project. Your build and end result are not modified for
            attribution; this page exists only within the G.R.I.P. application to document our
            platform&apos;s use of GitHub and open source and to pay homage to original creators,
            while keeping your delivered project clean and under your control.
          </p>

          <h2 className="text-xl font-semibold text-text-primary mt-6">Contact</h2>
          <p>
            For questions about attributions or open-source usage, see our{' '}
            <Link href="/contact" className="text-primary hover:underline">Contact</Link> page.
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
