import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { BackAndDashboardNav } from '@/components/layout/BackAndDashboardNav'

const KNOWN_DOC_PATHS: Record<string, { title: string; description: string }> = {
  'getting-started': { title: 'Getting Started', description: 'Introduction to G.R.I.P.' },
  'getting-started/quick-start': { title: 'Quick Start', description: 'Get up and running quickly.' },
  'getting-started/concepts': { title: 'Core Concepts', description: 'Fundamental concepts behind G.R.I.P.' },
  'features/planning': { title: 'Project Planning', description: 'Plan projects with G.R.I.P.' },
  'features/enhanced-chat': { title: 'Enhanced Chat', description: 'Contextual AI assistance.' },
  'features/code-generation': { title: 'Code Generation', description: 'Generate code from requirements.' },
  'features/automation': { title: 'Project Automation', description: 'Automate development tasks.' },
  'features/ideation-and-build': { title: 'How Your Ideation Drives the Build', description: 'How goals, audience, features, and technical requirements are used throughout the build.' },
  'api': { title: 'API Reference', description: 'G.R.I.P. API documentation.' },
  'integrations/github': { title: 'GitHub Integration', description: 'Connect GitHub to G.R.I.P.' },
  'integrations/mongodb': { title: 'MongoDB', description: 'Database setup and usage.' },
  'integrations/deploy-vercel': { title: 'Deploy to Vercel & FAQs', description: 'Flow, instructions, and FAQs for devs and non-devs.' },
  'advanced': { title: 'Advanced Guides', description: 'In-depth guides for production use.' },
  'advanced/custom-prompts': { title: 'Custom Prompts', description: 'Customize AI behavior with GRIP memory and ideation.' },
  'advanced/templates': { title: 'Project Templates', description: 'Use and create code templates for consistent output.' },
  'advanced/production': { title: 'Production Checklist', description: 'Checklist and operations for going to production.' },
  'best-practices': { title: 'Best Practices', description: 'Recommended practices for G.R.I.P.' },
  'security': { title: 'Security', description: 'How G.R.I.P. handles authentication, data, and API security.' },
}

/** Real content for each doc path so every link lands on a completed page. */
const DOC_CONTENT: Record<string, ReactNode> = {
  'getting-started': (
    <>
      <p>G.R.I.P. (Generated Requirements to Implementation Pipeline) is an AI-powered development assistant that helps you go from idea to working code. You create a project with a name, description, and a GitHub repo (required—G.R.I.P. analyzes the repo and uses its structure and patterns to guide the build). You then answer ideation questions—goals, target audience, key features, and technical requirements—in plain language or with technical details. After that, you open the Develop tab and chat with G.R.I.P. to build; code from chat is applied to the project automatically and the build runs automatically. Progress (phases and steps) syncs on the Overview tab.</p>
      <p className="mt-4">You do not need to write code yourself: describe what you want, and G.R.I.P. generates and applies code, runs the build, and keeps the project in sync. When you are ready, you can export the project to GitHub and deploy to Vercel (or use your own CI/CD).</p>
      <p className="mt-4">Next: <Link href="/docs/getting-started/quick-start" className="text-primary hover:underline">Quick Start</Link> for a short step-by-step path, or <Link href="/docs/getting-started/concepts" className="text-primary hover:underline">Core Concepts</Link> for projects, chat, and export. <Link href="/docs/features/ideation-and-build" className="text-primary hover:underline">How Your Ideation Drives the Build</Link> explains how your goals and features are used throughout the build.</p>
    </>
  ),
  'getting-started/quick-start': (
    <>
      <p>Get up and running in a few steps:</p>
      <ol className="list-decimal pl-6 mt-2 space-y-3">
        <li><strong>Sign in</strong> at the dashboard and create a new project. Enter a project name and description, then select a GitHub repo (required). Use &quot;Generate Keywords&quot; and &quot;Search&quot; in the repo selector to find a repo that matches your idea; pick one from the list.</li>
        <li><strong>Answer ideation</strong> (Step 2): goals, target audience, key features, and technical requirements. Plain language works (e.g. &quot;simple to-do list&quot;, &quot;works on phones&quot;). For technical projects you can add stack preferences or acceptance criteria. This information is used in repo analysis, plan generation, and Develop chat so the build aligns with your intent.</li>
        <li><strong>Open the Develop tab</strong> and describe your app or the feature you want. G.R.I.P. applies code to the project and runs the build automatically. You do not need to save or run commands manually. Progress and phases appear on the Overview tab.</li>
        <li><strong>Export and deploy</strong> when ready: use Export to GitHub from the project, then connect the repo in Vercel (or your own pipeline). One GitHub token in Dashboard → Settings is used for all exports.</li>
      </ol>
      <p className="mt-4">For more detail: <Link href="/docs/getting-started" className="text-primary hover:underline">Getting Started</Link>, <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link>, and <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</p>
    </>
  ),
  'getting-started/concepts': (
    <>
      <p>Core concepts in G.R.I.P.:</p>
      <ul className="list-disc pl-6 mt-2 space-y-2">
        <li><strong>Projects</strong> — Each project has its own chat context, files, plan, and settings. Create one project per app. A GitHub repo is required so G.R.I.P. can analyze it and use its structure and patterns; the app does not copy repo code—it uses the repo as a reference for structure and patterns.</li>
        <li><strong>Ideation</strong> — Your goals, target audience, key features, and technical requirements. This is ingested into repository analysis, plan generation, and Develop chat so the build matches your intent. You can update it anytime in project Settings.</li>
        <li><strong>Enhanced Chat (Develop)</strong> — Context-aware AI that can read your project (files, structure, ideation), generate and edit code, create files, and run the build. Code from chat is applied automatically; no manual save or run steps.</li>
        <li><strong>Generated files and build</strong> — Files created or updated by the AI are listed in the project; the build runs automatically. You can view, edit, and export. Phases and steps sync on the Overview tab.</li>
        <li><strong>Export and deploy</strong> — Export to GitHub (one token in Settings), then deploy to Vercel or use your own CI/CD. See <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</li>
      </ul>
      <p className="mt-4">Related: <Link href="/docs/features/planning" className="text-primary hover:underline">Project Planning</Link>, <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link>, <Link href="/docs/features/ideation-and-build" className="text-primary hover:underline">How Your Ideation Drives the Build</Link>.</p>
    </>
  ),
  'features/planning': (
    <>
      <p>G.R.I.P. helps you plan and build in one flow. When you create a project, you provide a name, description, and a GitHub repo. G.R.I.P. analyzes the repo and compares it to your ideation (goals, audience, features, technical requirements) to produce a development plan—phases and steps—that aligns with your intent. The plan is not generic: it is tailored to your description and the repo structure.</p>
      <p className="mt-4">You do not have to write a formal spec first. Describe your project in the create flow and in ideation; the AI uses that to suggest structure, routes, and implementation order. In the Develop tab you can then refine requirements in chat and generate code step by step. The generated-files list and Overview show progress.</p>
      <p className="mt-4">Best approach: fill in project details and ideation clearly (plain language or technical), pick a repo that matches your idea, then open Develop and describe what you want built. For more on how ideation is used: <Link href="/docs/features/ideation-and-build" className="text-primary hover:underline">How Your Ideation Drives the Build</Link>. For chat and automation: <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link>, <Link href="/docs/features/automation" className="text-primary hover:underline">Project Automation</Link>, <Link href="/docs/best-practices" className="text-primary hover:underline">Best Practices</Link>.</p>
    </>
  ),
  'features/enhanced-chat': (
    <>
      <p>Enhanced Chat (the Develop tab) is the main interface for working with the AI. It has full context for your project: files, structure, plan, and your ideation (goals, audience, features, technical requirements). The AI can generate or edit code, create files, and run the build. You describe what you want in plain language; G.R.I.P. applies code to the project and runs the build automatically—no manual save or run steps.</p>
      <p className="mt-4">Tips for best results: be specific about what you want (e.g. &quot;add a login form to the home page&quot;, &quot;add an API route for /api/users&quot;); reference existing files by name when relevant; and use the generated-files section to review what the AI created. You can also refer to your goals or target audience in chat; the model uses that context. Progress and phases sync on the Overview tab.</p>
      <p className="mt-4">Related: <Link href="/docs/features/automation" className="text-primary hover:underline">Project Automation</Link> (how code apply and build work), <Link href="/docs/features/code-generation" className="text-primary hover:underline">Code Generation</Link>, <Link href="/docs/best-practices" className="text-primary hover:underline">Best Practices</Link>.</p>
    </>
  ),
  'features/code-generation': (
    <>
      <p>Code generation in G.R.I.P. happens through Enhanced Chat in the Develop tab. You describe what you need—a component, a page, an API route, or edits to existing code—and the AI produces code and creates or updates files in your project. Generated files appear in the project; you can open, edit, and export them. The build runs automatically after changes.</p>
      <p className="mt-4">You can ask for full files, snippets, or targeted edits. The AI uses your project context (structure, ideation, existing code) so generated code fits your stack and goals. For consistent structure across projects, use <Link href="/docs/advanced/templates" className="text-primary hover:underline">Templates</Link>; for customizing AI behavior, see <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link>.</p>
    </>
  ),
  'features/automation': (
    <>
      <p><strong>Full automation in Develop:</strong> Code from chat is applied to the project automatically, and the build runs automatically. There are no manual save or run steps. Phases and steps sync on the Overview tab; G.R.I.P. focuses on the current phase and, when done, you can move to the next or continue in chat.</p>
      <p className="mt-4">Project automation also covers any flow that combines chat, code generation, and build: for example, &quot;add a new API route&quot; or &quot;fix lint errors.&quot; Use clear instructions in Enhanced Chat; the generated-files list shows what changed. For getting the app live, see <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</p>
    </>
  ),
  'integrations/github': (
    <>
      <p>G.R.I.P. uses a single GitHub token (stored in Dashboard → Settings) for Export to GitHub. Set the token once; it is used for all projects when you export. Export creates or updates a GitHub repo with your project files and stores the repo URL on the project. The token is not logged or exposed in API responses; use a token with minimal scope (e.g. repo) and rotate it periodically.</p>
      <p className="mt-4">When creating a project, you must select a GitHub repo (required). Use the repo selector: enter title and description, then &quot;Generate Keywords&quot; and &quot;Search&quot; to find repos that match your idea. G.R.I.P. analyzes the repo you choose and uses its structure and patterns to guide the build; it does not copy repo code. After exporting, connect the repo in Vercel or any CI/CD. See <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link> for the full flow.</p>
    </>
  ),
  'integrations/mongodb': (
    <>
      <p>Connect your own MongoDB in <strong>Dashboard → Settings → Backend connections</strong>: add your connection string, test and save it, then create collections from the same page. G.R.I.P. uses this when building fullstack apps (Develop) so it can suggest <code className="text-sm bg-muted px-1 rounded">MONGODB_URI</code> and wire your app to your database. You can add connection logic in generated code and use environment variables; store secrets in Dashboard → Settings or in your deployment platform (e.g. Vercel).</p>
      <p className="mt-4 font-medium">Seeing the same projects locally and on Vercel</p>
      <p className="mt-1">G.R.I.P. stores projects, users, and chat in MongoDB. If you create a project on the deployed app (Vercel) but it does not show when you run <code className="text-sm bg-muted px-1 rounded">npm run dev</code> locally, local and Vercel are using different databases. Fix: use the same <code className="text-sm bg-muted px-1 rounded">MONGODB_URI</code> in both places. Copy the value from Vercel (Project → Settings → Environment Variables) into your local <code className="text-sm bg-muted px-1 rounded">.env.local</code>, then restart <code className="text-sm bg-muted px-1 rounded">npm run dev</code>. After that, projects created on Vercel will appear locally and vice versa.</p>
      <p className="mt-4">Related: <Link href="/docs/getting-started/quick-start" className="text-primary hover:underline">Quick Start</Link>, <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</p>
    </>
  ),
  'integrations/deploy-vercel': (
    <>
      <p>Deploy to Vercel uses your project&apos;s GitHub repo (linked or exported) and triggers a production deployment via Vercel&apos;s API.</p>
      <p className="mt-4"><strong>Flow:</strong> (1) Get the project on GitHub—use Export to GitHub from the project, or link a repo when creating the project. (2) In Vercel, import that repo once (vercel.com → Add New → Project). (3) In G.R.I.P., open the project and click Deploy to Vercel.</p>
      <p className="mt-4"><strong>One GitHub token for all projects.</strong> Set it once in Dashboard → Settings; it is used for Export to GitHub for every project.</p>
      <p className="mt-4">The full guide with step-by-step instructions for devs and non-devs, and FAQs, is in the repository: <code className="text-sm bg-muted px-1 rounded">docs/DEPLOY-TO-VERCEL-AND-FAQS.md</code>. You can also use the <strong>Deploy to Vercel – FAQs &amp; instructions</strong> section on the project Preview page.</p>
    </>
  ),
  'advanced': (
    <>
      <p>The Advanced Guides cover everything you need to use G.R.I.P. effectively in production: customizing AI behavior, using and creating templates, and a production checklist.</p>
      <p className="mt-4 font-medium">Custom Prompts</p>
      <p>G.R.I.P. does not use a separate &quot;system prompt&quot; field in Settings. Instead, you customize behavior in two ways: (1) <strong>GRIP memory</strong> — tell the AI to &quot;remember&quot; something in Develop chat (e.g. &quot;remember that I prefer TypeScript&quot;); the system saves it and injects it into context on every turn. (2) <strong>Ideation in chat</strong> — share goals, audience, or features in plain English; the AI can update the project&apos;s ideation so future code stays aligned. See <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link> for full details and examples.</p>
      <p className="mt-4 font-medium">Project Templates</p>
      <p>Templates are reusable code starting points (React component, Next.js page, TypeScript utility, package.json, tsconfig, .env.example, etc.). Built-in templates are always available; custom templates can be stored per project and used by the file generator and Develop chat. See <Link href="/docs/advanced/templates" className="text-primary hover:underline">Project Templates</Link> for how they work, how to use them, and how to create custom templates.</p>
      <p className="mt-4 font-medium">Production Checklist</p>
      <p>Before going live: security (tokens, env vars), deployment (Export to GitHub, Deploy to Vercel), and best practices. See <Link href="/docs/advanced/production" className="text-primary hover:underline">Production Checklist</Link>.</p>
      <p className="mt-6">
        <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link>
        {' · '}
        <Link href="/docs/advanced/templates" className="text-primary hover:underline">Project Templates</Link>
        {' · '}
        <Link href="/docs/advanced/production" className="text-primary hover:underline">Production Checklist</Link>
        {' · '}
        <Link href="/docs" className="text-primary hover:underline">Documentation index</Link>
      </p>
    </>
  ),
  'advanced/custom-prompts': (
    <>
      <p>You can tailor how the AI behaves for your project without editing a &quot;system prompt&quot; in Settings. G.R.I.P. uses two mechanisms: <strong>GRIP memory</strong> (saved instructions from chat) and <strong>ideation updates</strong> (goals, audience, features in plain English). Both are applied in every Develop chat turn so generated code stays consistent with your preferences.</p>

      <p className="mt-4 font-medium">GRIP memory: &quot;Remember&quot; in chat</p>
      <p>In the Develop tab, tell the AI to remember something for all future messages. The AI saves it and the system injects it into context on every turn. Examples:</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li>&quot;Remember that I prefer TypeScript over JavaScript.&quot;</li>
        <li>&quot;From now on always use Tailwind for styling.&quot;</li>
        <li>&quot;Don&apos;t suggest npm install unless I ask.&quot;</li>
        <li>&quot;No tests for this project unless I say otherwise.&quot;</li>
      </ul>
      <p className="mt-2">After you say this, the AI confirms (e.g. &quot;Got it, I&apos;ll do that from now on.&quot;) and the instruction is stored on the project. It applies to all subsequent messages in that project. You can add multiple instructions over time; they are listed in the context the AI sees. There is no separate Settings screen for these—they live in the project and are managed through chat.</p>

      <p className="mt-4 font-medium">Updating ideation in chat</p>
      <p>You can also refine goals, target audience, key features, or technical requirements in plain English during a chat. For example: &quot;Actually, the target audience is small teams, not solo users&quot; or &quot;Add: must work offline.&quot; When the AI detects lasting project details, it can output an internal update that saves to the project&apos;s ideation. Future code and plan generation then use the updated ideation. For bulk edits, use <strong>Project → Settings</strong> to edit goals, audience, features, and technical requirements directly.</p>

      <p className="mt-4 font-medium">Best practices for production</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>Be clear and lasting</strong> — Use &quot;remember&quot; for preferences that should apply to all future responses (style, stack, don&apos;t do X). One instruction per &quot;remember&quot; is easiest to manage; you can add more over time.</li>
        <li><strong>Combine with ideation</strong> — Use Settings ideation for high-level goals and audience; use GRIP memory for implementation preferences (TypeScript, Tailwind, no tests). Together they keep the build aligned with your intent.</li>
        <li><strong>Review what&apos;s saved</strong> — If the AI ever forgets or contradicts a preference, say &quot;remember that...&quot; again or update ideation in Settings. There is no UI today to delete a single memory; updating or re-stating in chat keeps context accurate.</li>
      </ul>
      <p className="mt-4">Related: <Link href="/docs/features/ideation-and-build" className="text-primary hover:underline">How Your Ideation Drives the Build</Link>, <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link>, <Link href="/docs/advanced/templates" className="text-primary hover:underline">Project Templates</Link>. API options for chat are in the <Link href="/docs/api" className="text-primary hover:underline">API Reference</Link>.</p>
    </>
  ),
  'advanced/templates': (
    <>
      <p>Templates are reusable code starting points used when G.R.I.P. generates files. They define structure, variables (e.g. component name, props), and optional default values so output is consistent and project-specific.</p>

      <p className="mt-4 font-medium">What templates exist</p>
      <p><strong>Built-in templates</strong> are always available and include: React component (TypeScript), Next.js page, TypeScript utility file, package.json, tsconfig.json, entry point (e.g. index.tsx), and .env.example. They are used automatically by the file generator and by Develop chat when creating new files so the app stays runnable (e.g. correct scripts for Next.js vs Vite, proper tsconfig).</p>
      <p className="mt-2"><strong>Custom templates</strong> can be stored per project in the database. They are loaded together with built-ins when generating code for that project. Use custom templates for team-specific patterns (e.g. a standard API route shape, a shared layout component) so every generated file follows the same structure.</p>

      <p className="mt-4 font-medium">How templates are used</p>
      <p>When you ask the AI in Develop to create a file (e.g. &quot;add a new page for the dashboard&quot;), the system picks an appropriate template (or generates from scratch when no template fits), fills in variables (e.g. page name, content), and writes the file. The API <code className="text-sm bg-muted px-1 rounded">GET /api/templates?projectId=...</code> returns all available templates (built-in + custom for that project). File generation and chat use this list so project-specific custom templates are included.</p>

      <p className="mt-4 font-medium">Creating a custom template</p>
      <p>Custom templates are stored in the <code className="text-sm bg-muted px-1 rounded">templates</code> collection in MongoDB with: <code className="text-sm bg-muted px-1 rounded">id</code>, <code className="text-sm bg-muted px-1 rounded">name</code>, <code className="text-sm bg-muted px-1 rounded">description</code>, <code className="text-sm bg-muted px-1 rounded">language</code>, <code className="text-sm bg-muted px-1 rounded">fileType</code>, <code className="text-sm bg-muted px-1 rounded">template</code> (string with placeholders), <code className="text-sm bg-muted px-1 rounded">variables</code> (array of variable names), <code className="text-sm bg-muted px-1 rounded">defaultValues</code> (optional), and <code className="text-sm bg-muted px-1 rounded">isBuiltIn: false</code>. Optionally set <code className="text-sm bg-muted px-1 rounded">projectId</code> so the template is only available for that project. Placeholders use double curly braces: <code className="text-sm bg-muted px-1 rounded">{'{{VariableName}}'}</code>. For repeated blocks use <code className="text-sm bg-muted px-1 rounded">{'{{#array}}...{{/array}}'}</code>. Today, custom templates are created programmatically (e.g. via a script or admin tool that calls the template service); a UI for creating them in the dashboard can be added later.</p>

      <p className="mt-4 font-medium">Production use</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li>Rely on built-in templates for consistency (package.json, tsconfig, entry point) so the app always runs and previews correctly.</li>
        <li>Add custom templates for shared patterns (e.g. API route, layout, form component) so every new file matches your team&apos;s conventions.</li>
        <li>When integrating with the API, pass <code className="text-sm bg-muted px-1 rounded">projectId</code> when fetching templates so project-specific custom templates are included in code generation.</li>
      </ul>
      <p className="mt-4">Related: <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link>, <Link href="/docs/features/code-generation" className="text-primary hover:underline">Code Generation</Link>, <Link href="/docs/api" className="text-primary hover:underline">API Reference</Link> (Projects, Files, AI).</p>
    </>
  ),
  'advanced/production': (
    <>
      <p>Use this checklist before taking your app or your G.R.I.P. usage to production.</p>

      <p className="mt-4 font-medium">Security</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>GitHub token</strong> — Set in Dashboard → Settings. Use minimal scope (e.g. repo). Rotate periodically. See <Link href="/docs/security" className="text-primary hover:underline">Security</Link>.</li>
        <li><strong>Environment variables</strong> — Never commit API keys or secrets. Use .env.local (or host env vars) for Anthropic, Resend, MongoDB, etc. See <Link href="/docs/security" className="text-primary hover:underline">Security</Link> and <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</li>
        <li><strong>MongoDB</strong> — Use a dedicated database for production. Restrict network access and use strong credentials. See <Link href="/docs/integrations/mongodb" className="text-primary hover:underline">MongoDB</Link>.</li>
      </ul>

      <p className="mt-4 font-medium">Deployment</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>Export to GitHub</strong> — Get your project on GitHub (one token in Settings). Then connect the repo in Vercel or your CI/CD.</li>
        <li><strong>Deploy to Vercel</strong> — Use the project&apos;s Deploy to Vercel flow or the full guide in <code className="text-sm bg-muted px-1 rounded">docs/DEPLOY-TO-VERCEL-AND-FAQS.md</code>. Set env vars in Vercel (e.g. MONGODB_URI, NEXTAUTH_SECRET). See <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>.</li>
        <li><strong>Same data locally and in production</strong> — Use the same MONGODB_URI locally and on Vercel if you want projects created in one place to appear in the other. See <Link href="/docs/integrations/mongodb" className="text-primary hover:underline">MongoDB</Link>.</li>
      </ul>

      <p className="mt-4 font-medium">Best practices</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>Ideation and GRIP memory</strong> — Fill in goals, audience, features, and technical requirements; use &quot;remember&quot; in Develop for preferences. This keeps the build aligned with your intent. See <Link href="/docs/advanced/custom-prompts" className="text-primary hover:underline">Custom Prompts</Link> and <Link href="/docs/features/ideation-and-build" className="text-primary hover:underline">How Your Ideation Drives the Build</Link>.</li>
        <li><strong>Review generated files</strong> — Check the generated-files list and Overview before exporting or deploying. Fix any lint or build errors in chat.</li>
        <li><strong>Templates</strong> — Use built-in templates for consistency; add custom templates for team patterns. See <Link href="/docs/advanced/templates" className="text-primary hover:underline">Project Templates</Link>.</li>
      </ul>

      <p className="mt-4 font-medium">API and integrations</p>
      <p>If you integrate with the G.R.I.P. API, use session-based auth (credentials: include), respect rate limits, and handle errors. See <Link href="/docs/api" className="text-primary hover:underline">API Reference</Link> and <Link href="/docs/security" className="text-primary hover:underline">Security</Link>.</p>

      <p className="mt-6">
        <Link href="/docs/advanced" className="text-primary hover:underline">Advanced Guides</Link>
        {' · '}
        <Link href="/docs/security" className="text-primary hover:underline">Security</Link>
        {' · '}
        <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link>
        {' · '}
        <Link href="/docs" className="text-primary hover:underline">Documentation index</Link>
      </p>
    </>
  ),
  'best-practices': (
    <>
      <p>Recommended practices when using G.R.I.P.:</p>
      <ul className="list-disc pl-6 mt-2 space-y-2">
        <li><strong>Be specific in chat</strong> — Describe what you want (e.g. component name, file path, behavior) so the AI can generate accurate code. Refer to your goals or features when relevant; the model uses your ideation context.</li>
        <li><strong>Fill in ideation</strong> — Goals, target audience, key features, and technical requirements are used in repo analysis, plan generation, and Develop chat. The more specific you are, the better the build aligns with your intent.</li>
        <li><strong>Review generated files</strong> — Use the project generated-files list to review and edit before committing or deploying. The build runs automatically; check Overview for phases and progress.</li>
        <li><strong>One GitHub token</strong> — Set it in Settings once; use Export to GitHub for each project when ready. Use a token with minimal scope and rotate it periodically.</li>
        <li><strong>Use templates</strong> — Start from a template that matches your stack for consistent structure and fewer setup steps.</li>
      </ul>
      <p className="mt-4">Related: <Link href="/docs/features/enhanced-chat" className="text-primary hover:underline">Enhanced Chat</Link>, <Link href="/docs/features/ideation-and-build" className="text-primary hover:underline">How Your Ideation Drives the Build</Link>, <Link href="/docs/getting-started/quick-start" className="text-primary hover:underline">Quick Start</Link>.</p>
    </>
  ),
  'api': (
    <>
      <p>G.R.I.P. exposes REST-style API routes used by the dashboard and available to integrators. The full reference—endpoints, request/response shapes, authentication, and examples—lives on a single dedicated page so you can copy and try requests in one place.</p>
      <p className="mt-4"><strong>Who it’s for:</strong> The dashboard uses these APIs for projects, chat, files, and AI (e.g. keyword generation). If you’re building a custom client or integrating with another tool, use the same endpoints with session-based auth (cookies) or the documented request shapes.</p>
      <p className="mt-4"><strong>Where to go:</strong> Open the full API Reference for all categories (Projects, AI, Files, Chat, Support, Analytics), authentication details, and error formats.</p>
      <p className="mt-4">
        <Link href="/docs/api" className="text-primary font-medium hover:underline">Open full API Reference →</Link>
      </p>
      <p className="mt-6">
        <Link href="/docs" className="text-primary hover:underline">← Documentation index</Link>
      </p>
    </>
  ),
  'security': (
    <>
      <p>G.R.I.P. is designed so your data and credentials stay under your control. This page summarizes how we handle authentication, secrets, and API security.</p>
      <p className="mt-4 font-medium">Authentication</p>
      <p>Sign-in is handled by NextAuth. Sessions are cookie-based; the app does not store your GitHub or OAuth passwords. You sign in with a provider (e.g. GitHub); G.R.I.P. only receives the tokens and user identity that the provider shares. Session cookies are HTTP-only and used only to authorize requests to the dashboard and API.</p>
      <p className="mt-4 font-medium">Secrets and tokens</p>
      <p>GitHub token: You optionally add a GitHub Personal Access Token in Dashboard → Settings for Export to GitHub. It is stored in the database and used only when you trigger an export for a project. It is not logged or exposed in API responses. We recommend a token with minimal scope (e.g. repo) and rotating it periodically.</p>
      <p className="mt-2">API keys (e.g. Anthropic, Resend): If you self-host, you configure these in your environment. The G.R.I.P. app uses them server-side only; they are never sent to the client or included in project exports.</p>
      <p className="mt-4 font-medium">Data</p>
      <p>Project data, chat history, and file content are stored in your MongoDB (or the MongoDB you connect in Settings). G.R.I.P. does not use your project or repo data for training models; it is used only to serve your session (analysis, plan, chat, code generation). Export to GitHub and Deploy to Vercel send only the data you choose (e.g. project files) to the services you authorize.</p>
      <p className="mt-4 font-medium">API security</p>
      <p>API routes require an authenticated session. Unauthenticated requests receive 401. Rate limiting applies to sensitive endpoints (e.g. AI, support). Error responses do not leak internal details. For deployment and environment variables, see <Link href="/docs/integrations/deploy-vercel" className="text-primary hover:underline">Deploy to Vercel</Link> and your host’s security best practices.</p>
      <p className="mt-6">
        <Link href="/docs" className="text-primary hover:underline">← Documentation index</Link>
      </p>
    </>
  ),
  'features/ideation-and-build': (
    <>
      <p>Your project ideation—goals, target audience, key features, and technical requirements—is used throughout the build so the generated plan and code align with what you want.</p>
      <p className="mt-4 font-medium">Where ideation is used</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li><strong>Repository analysis</strong> — When you link a GitHub repo, G.R.I.P. analyzes its structure and compares it to your ideation. Your goals, features, and technical requirements guide what the analysis emphasizes (e.g. routes, data layer, auth) and what “missing capabilities” are flagged so the plan can address them.</li>
        <li><strong>Plan generation</strong> — The development plan (phases and steps) is built from repo analysis plus your ideation. Goals and key features drive which layers (e.g. website, web app, data) are active; technical requirements and target audience influence stack guidance and quality bar. The plan is not generic—it’s tailored to your description.</li>
        <li><strong>Develop chat and code generation</strong> — In the Develop tab, the AI has access to your project context, including ideation. When it generates or edits code, it uses your goals, features, and technical requirements to keep the build aligned with your intent. You can also refer to “my goals” or “target audience” in chat and the model will use that context.</li>
        <li><strong>Keyword generation</strong> — When you use Generate Keywords to find a repo, optional ideation (if you’ve filled it in) is passed to the AI so suggested search keywords better match your project and lead to a better repo match.</li>
      </ul>
      <p className="mt-4">The more specific you are in ideation (in plain language or technical terms), the better the analysis, plan, and generated code can match your vision. You can update ideation in project Settings at any time; later chat and builds will use the updated context.</p>
      <p className="mt-6">
        <Link href="/docs/features/planning" className="text-primary hover:underline">Project Planning</Link>
        {' · '}
        <Link href="/docs/getting-started/concepts" className="text-primary hover:underline">Core Concepts</Link>
        {' · '}
        <Link href="/docs" className="text-primary hover:underline">Documentation index</Link>
      </p>
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
          <BackAndDashboardNav
            backFallbackHref="/docs"
            backLabel="Back to Docs"
          />
        </div>
      </main>
    </div>
  )
}
