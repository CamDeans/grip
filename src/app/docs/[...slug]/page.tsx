import Link from 'next/link'
import { notFound } from 'next/navigation'

const KNOWN_DOC_PATHS: Record<string, { title: string; description: string }> = {
  'getting-started': { title: 'Getting Started', description: 'Introduction to G.R.I.P.' },
  'getting-started/quick-start': { title: 'Quick Start', description: 'Get up and running quickly.' },
  'getting-started/concepts': { title: 'Core Concepts', description: 'Fundamental concepts behind G.R.I.P.' },
  'features/planning': { title: 'Project Planning', description: 'Plan projects with G.R.I.P.' },
  'features/enhanced-chat': { title: 'Enhanced Chat', description: 'Contextual AI assistance.' },
  'features/code-generation': { title: 'Code Generation', description: 'Generate code from requirements.' },
  'features/automation': { title: 'Project Automation', description: 'Automate development tasks.' },
  'api': { title: 'API Reference', description: 'G.R.I.P. API documentation.' },
  'integrations/github': { title: 'GitHub Integration', description: 'Connect GitHub to G.R.I.P.' },
  'integrations/mongodb': { title: 'MongoDB', description: 'Database setup and usage.' },
  'advanced/custom-prompts': { title: 'Custom Prompts', description: 'Customize AI prompts.' },
  'advanced/templates': { title: 'Templates', description: 'Use and create templates.' },
  'best-practices': { title: 'Best Practices', description: 'Recommended practices for G.R.I.P.' },
}

interface DocSlugPageProps {
  params: Promise<{ slug: string[] }>
}

export default async function DocSlugPage({ params }: DocSlugPageProps) {
  const { slug } = await params
  const path = slug.join('/')
  const meta = KNOWN_DOC_PATHS[path]
  if (!meta) notFound()

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="border-b border-border bg-background-secondary">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/docs" className="text-xl font-semibold text-primary">
            G.R.I.P. Docs
          </Link>
          <Link href="/dashboard" className="text-sm text-primary hover:text-primary-hover">
            Dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary mb-2">{meta.title}</h1>
        <p className="text-text-secondary mb-6">{meta.description}</p>
        <div className="prose prose-invert max-w-none text-text-secondary">
          <p>This section is being expanded. For full documentation, see the main docs index and API reference.</p>
          <ul className="list-disc pl-6 mt-4">
            <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
            <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
          </ul>
        </div>
        <div className="mt-8">
          <Link href="/docs" className="text-primary hover:text-primary-hover">
            ← Back to Docs
          </Link>
        </div>
      </main>
    </div>
  )
}
