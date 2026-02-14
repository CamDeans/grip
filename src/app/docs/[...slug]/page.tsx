import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

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
  'integrations/deploy-vercel': { title: 'Deploy to Vercel & FAQs', description: 'Flow, instructions, and FAQs for devs and non-devs.' },
  'advanced/custom-prompts': { title: 'Custom Prompts', description: 'Customize AI prompts.' },
  'advanced/templates': { title: 'Templates', description: 'Use and create templates.' },
  'best-practices': { title: 'Best Practices', description: 'Recommended practices for G.R.I.P.' },
}

/** Real content for each doc path so every link lands on a completed page. */
const DOC_CONTENT: Record<string, ReactNode> = {
  'getting-started': (
    <>
      <p>G.R.I.P. (Generated Requirements to Implementation Pipeline) is an AI-powered development assistant that helps you go from idea to working code. Create a project with a GitHub repo (required—GRIP analyzes it and uses its structure and patterns), answer ideation questions, then chat in Develop to build. Code from chat is applied automatically and the build runs automatically; progress syncs on Overview.</p>
      <p className="mt-4">Key steps: create a project (name, description, and a GitHub repo), answer ideation (goals, audience, features—plain language or technical details), then open Develop to chat with GRIP. Code applies and the build runs automatically; when ready, export to GitHub or deploy to Vercel. For a short path, see <Link href="/docs/getting-started/quick-start" className="text-primary hover:underline">Quick Start</Link>. For concepts, see <Link href="/docs/getting-started/concepts" className="text-primary hover:underline">Core Concepts</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'getting-started/quick-start': (
    <>
      <p>Get up and running in a few steps:</p>
      <ol className="list-decimal pl-6 mt-2 space-y-2">
        <li>Sign in at the dashboard and create a new project: name, description, and a GitHub repo (required—use Generate Keywords and Search to find one).</li>
        <li>Answer ideation questions (goals, audience, features). Plain language works; you can add technical details for higher-level projects.</li>
        <li>Open the Develop tab and describe your app or feature. GRIP applies code and runs the build automatically; progress syncs on Overview.</li>
        <li>When ready, export to GitHub from the project, then deploy to Vercel or use your own CI/CD.</li>
      </ol>
      <p className="mt-4">For more detail, see <Link href="/docs/getting-started" className="text-primary hover:underline">Getting Started</Link> and <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'getting-started/concepts': (
    <>
      <p>Core concepts in G.R.I.P.:</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>Projects</strong> — Each project has its own chat context, files, and settings. Create one per app; a GitHub repo is required so GRIP can analyze it and use its structure and patterns.</li>
        <li><strong>Enhanced Chat</strong> — Context-aware AI that can read your project, generate and edit files, and run terminal commands.</li>
        <li><strong>Generated files</strong> — Files created or updated by the AI are listed in the project; you can view, edit, and commit them.</li>
        <li><strong>Export & deploy</strong> — Export to GitHub (one token in Settings), then use Deploy to Vercel or your own pipeline.</li>
      </ul>
      <p className="mt-4">See <Link href="/docs/features/planning" className="text-primary hover:underline">Project Planning</Link> and <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link> for more.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'features/planning': (
    <>
      <p>Use G.R.I.P. to plan projects before coding: describe goals and scope in Enhanced Chat, break down features into tasks, and let the AI suggest structure and file layout. You can create a project, outline requirements in chat, and then use code generation to implement step by step.</p>
      <p className="mt-4">Best approach: start with a short project description, ask the AI to suggest a plan or file structure, then iterate in chat and generate files as you go. See <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link> and <Link href="/docs/best-practices" className="text-primary hover:underline">Best Practices</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'features/enhanced-chat': (
    <>
      <p>Enhanced Chat is the main interface for working with the AI: it has context for your project (files, structure, and history) and can generate or edit code, create files, and run terminal commands. Use it to refine requirements, implement features, and fix issues without leaving the dashboard.</p>
      <p className="mt-4">Tips: be specific about what you want (e.g. &quot;add a login form to App.tsx&quot;), reference existing files by name when needed, and use the generated-files section to review and edit what the AI created. For automation, see <Link href="/docs/features/automation" className="text-primary hover:underline">Project Automation</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'features/code-generation': (
    <>
      <p>Code generation in G.R.I.P. happens through Enhanced Chat: you describe what you need (a component, a page, an API route), and the AI produces code and can create or update files in your project. Generated files appear in the project overview under generated files; you can open, edit, and commit them.</p>
      <p className="mt-4">You can ask for full files, snippets, or edits to existing code. For consistency, see <Link href="/docs/advanced/templates" className="text-primary hover:underline">Templates</Link> and <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'features/automation': (
    <>
      <p><strong>Full automation:</strong> In the Develop tab, code from chat is applied to the project automatically and the build runs automatically—no manual save or run steps. Phases and steps sync on the Overview tab. GRIP focuses on the current phase; when it&apos;s done, it routes you back to Overview for the next phase.</p>
      <p className="mt-4">Project automation also covers flows that combine chat, code generation, and terminal commands: for example, &quot;add a new API route&quot; or &quot;fix lint errors.&quot; Use clear instructions in Enhanced Chat; the generated-files list shows changes. For deployment, see <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'integrations/github': (
    <>
      <p>G.R.I.P. uses a single GitHub token (stored in Dashboard → Settings) for actions like Export to GitHub. Set the token once; it is used for all projects when you export. Export creates or updates a GitHub repo with your project files and keeps the repo URL on the project.</p>
      <p className="mt-4">After exporting, you can connect the repo in Vercel or any CI/CD. For deployment, see <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>. For full API details, see <Link href="/docs/api" className="text-primary hover:underline">API Reference</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'integrations/mongodb': (
    <>
      <p>Connect your own MongoDB in <strong>Dashboard → Settings → Backend connections</strong>: add your connection string, test and save it, then create collections from the same page. GRIP uses this when building fullstack apps (Develop) so it can suggest <code className="text-sm bg-muted px-1 rounded">MONGODB_URI</code> and wire your app to your database. You can also add connection logic in generated code and use environment variables; store secrets in Dashboard → Settings or in your deployment platform (e.g. Vercel).</p>
      <p className="mt-4 font-medium">Seeing the same projects locally and on Vercel</p>
      <p className="mt-1">GRIP stores projects, users, and chat in MongoDB. If you create a project on the deployed app (Vercel) but it does not show when you run <code className="text-sm bg-muted px-1 rounded">npm run dev</code> locally, local and Vercel are using different databases. Fix: use the same <code className="text-sm bg-muted px-1 rounded">MONGODB_URI</code> in both places. Copy the value from Vercel (Project → Settings → Environment Variables) into your local <code className="text-sm bg-muted px-1 rounded">.env.local</code>, then restart <code className="text-sm bg-muted px-1 rounded">npm run dev</code>. After that, projects created on Vercel will appear locally and vice versa.</p>
      <p className="mt-4">For app structure and deployment, see <Link href="/docs/getting-started/quick-start" className="text-primary hover:underline">Quick Start</Link> and <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'integrations/deploy-vercel': (
    <>
      <p>Deploy to Vercel uses your project&apos;s GitHub repo (linked or exported) and triggers a production deployment via Vercel&apos;s API.</p>
      <p className="mt-2"><strong>Flow:</strong> (1) Get the project on GitHub (Export to GitHub or link a repo). (2) In Vercel, import that repo once (vercel.com → Add New → Project). (3) In GRIP, click Deploy to Vercel.</p>
      <p className="mt-2"><strong>One GitHub token for all projects.</strong> Set it once in Dashboard → Settings; it&apos;s used for Export to GitHub for every project.</p>
      <p className="mt-2">The full guide with step-by-step instructions for devs and non-devs, and FAQs, is in the repository: <code className="text-sm bg-muted px-1 rounded">docs/DEPLOY-TO-VERCEL-AND-FAQS.md</code>. You can also use the <strong>Deploy to Vercel – FAQs &amp; instructions</strong> section on the project Preview page.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'advanced/custom-prompts': (
    <>
      <p>Custom prompts let you tailor how the AI behaves for your project: you can set instructions or constraints that are included in the context for Enhanced Chat. Use project or account settings to define prompts that enforce style, conventions, or domain rules.</p>
      <p className="mt-4">Combine with <Link href="/docs/advanced/templates" className="text-primary hover:underline">Templates</Link> for consistent structure. For API options, see <Link href="/docs/api" className="text-primary hover:underline">API Reference</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'advanced/templates': (
    <>
      <p>Templates are starting points for new projects or features: they define tech stack, file layout, and optional boilerplate. When you create a project from a template, G.R.I.P. initializes files and structure so you can start chatting and generating code immediately.</p>
      <p className="mt-4">Use templates to keep stacks and patterns consistent. For customizing AI behavior, see <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link>.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'best-practices': (
    <>
      <p>Recommended practices when using G.R.I.P.:</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>Be specific in chat</strong> — Describe what you want (e.g. component name, file path, behavior) so the AI can generate accurate code.</li>
        <li><strong>Review generated files</strong> — Use the project generated-files list to review and edit before committing or deploying.</li>
        <li><strong>One GitHub token</strong> — Set it in Settings once; use Export to GitHub for each project when ready.</li>
        <li><strong>Use templates</strong> — Start from a template that matches your stack for consistent structure.</li>
      </ul>
      <p className="mt-4">See <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link> and <Link href="/docs/getting-started/quick-start" className="text-primary hover:underline">Quick Start</Link> for more.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
      </ul>
    </>
  ),
  'api': (
    <>
      <p>The full API reference lives on a dedicated page. Use it for endpoints, request/response shapes, and examples.</p>
      <ul className="list-disc pl-6 mt-4">
        <li><Link href="/docs/api" className="text-primary hover:underline">API Reference (full)</Link></li>
        <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
      </ul>
    </>
  ),
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
          {DOC_CONTENT[path] ?? (
            <>
              <p>This section is being expanded. For full documentation, see the main docs index and API reference.</p>
              <ul className="list-disc pl-6 mt-4">
                <li><Link href="/docs" className="text-primary hover:underline">Documentation index</Link></li>
                <li><Link href="/docs/api" className="text-primary hover:underline">API Reference</Link></li>
              </ul>
            </>
          )}
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
