'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import {
  MessageSquare,
  FolderGit2,
  Zap,
  Lightbulb,
  Play,
  Rocket,
  ChevronRight,
  Sparkles,
  FileCode2,
  GitBranch,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FLOW_STEPS = [
  {
    step: 1,
    title: 'Create project & describe your idea',
    description: 'Name your project and answer a few plain-English questions: goals, who it’s for, key features. No code required.',
    icon: Lightbulb,
    mockLabel: 'New project · Ideation',
  },
  {
    step: 2,
    title: 'Link a GitHub repo',
    description: 'Connect any public repo. GRIP clones it, analyzes structure and code, and uses it as the base for your build.',
    icon: GitBranch,
    mockLabel: 'Repo · File tree',
  },
  {
    step: 3,
    title: 'Plan & files — automatic',
    description: 'GRIP generates a development plan and starter files from your ideation and repo. No extra clicks; everything shows in Develop → Show Context.',
    icon: FileCode2,
    mockLabel: 'Plan & generated files',
  },
  {
    step: 4,
    title: 'Develop with GRIP in chat',
    description: 'Chat with GRIP to implement features, fix bugs, and add code. Save files to the project with one click. Build progress stays in sync.',
    icon: MessageSquare,
    mockLabel: 'Develop · Chat with GRIP',
  },
  {
    step: 5,
    title: 'Preview in StackBlitz',
    description: 'When GRIP suggests it, StackBlitz opens in a new tab so you can see the app run in the browser. Paste any errors back to GRIP for fixes.',
    icon: Play,
    mockLabel: 'Preview · Run in StackBlitz',
  },
  {
    step: 6,
    title: 'Export & deploy',
    description: 'Export to your GitHub or deploy to Vercel. Take your project from idea to live product without leaving GRIP.',
    icon: Rocket,
    mockLabel: 'Export · Deploy',
  },
] as const

const USE_CASES = [
  {
    title: 'I have an idea and a repo — I want an app, not a blank slate',
    description: 'You found a GitHub template or starter you like. GRIP uses your plain-English goals and that repo to generate a plan and code. You chat to refine; GRIP writes and updates files. Preview in-browser, then export or deploy.',
    cta: 'Get started free',
    href: '/register',
  },
  {
    title: "I'm not very technical but I want to ship something",
    description: 'Describe what you want in simple terms. GRIP guides you step by step, puts code in blocks you can save with one click, and opens StackBlitz so you can see the app run. No local install required.',
    cta: 'Try GRIP',
    href: '/register',
  },
  {
    title: 'I want to customize an existing project without breaking it',
    description: 'Link your repo. GRIP has full context of the codebase and your ideation. Ask for new features, fixes, or refactors; GRIP suggests full-file updates you save once. You and GRIP stay aligned on phases and next steps.',
    cta: 'Sign in',
    href: '/login',
  },
  {
    title: 'I want one place to go from idea → running app → deployed',
    description: 'Create project, link repo, chat with GRIP, preview in StackBlitz, then export to GitHub or deploy to Vercel. The whole flow lives in GRIP so you don’t juggle tools.',
    cta: 'See how it works',
    href: '#how-it-works',
  },
] as const

const MOCK_SCREENS = [
  { label: 'Dashboard', sublabel: 'Your projects', route: 'Overview · Repo · Develop · Preview' },
  { label: 'Create project', sublabel: 'Name, repo, ideation', route: 'Goals · Audience · Features' },
  { label: 'Repo', sublabel: 'Cloned GitHub repo', route: 'File tree · Search · Summaries' },
  { label: 'Develop', sublabel: 'Chat with GRIP', route: 'Code blocks · Save to project · Build progress' },
  { label: 'Preview', sublabel: 'Run in StackBlitz', route: 'Live app in browser' },
  { label: 'Export & deploy', sublabel: 'GitHub · Vercel', route: 'Ship your product' },
] as const

function MockBrowserFrame({
  label,
  sublabel,
  route,
  className,
}: {
  label: string
  sublabel: string
  route: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-background-secondary/80 overflow-hidden shadow-lg',
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background-tertiary/50">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[10px] text-muted-foreground font-mono bg-background px-2 py-0.5 rounded">
            app.grip.dev / {route}
          </span>
        </div>
      </div>
      <div className="p-4 min-h-[120px] flex flex-col justify-center">
        <p className="font-semibold text-text-primary text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
        <p className="text-[10px] text-muted-foreground/80 mt-2 font-mono">{route}</p>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      <header className="border-b border-border bg-background-secondary/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">G.R.I.P.</span>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 py-16 sm:py-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Guided Real-time Intelligence Partner
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-4 tracking-tight">
            Your AI development partner
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-2">
            Turn GitHub repos and ideas into runnable, deployable products. No juggling tools—one flow from idea to ship.
          </p>
          <p className="text-sm text-text-muted max-w-xl mx-auto mb-10">
            Create projects, link repos, chat with GRIP, save code with one click, preview in StackBlitz, and export or deploy. Built for developers and makers who want to move fast.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get started free
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg">
                See the flow
              </Button>
            </Link>
          </div>
        </section>

        {/* How it works — full app flow */}
        <section id="how-it-works" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-4">
              How GRIP works
            </h2>
            <p className="text-text-secondary text-center max-w-xl mx-auto mb-12">
              One clear path: create project → link repo → develop with GRIP → preview → export or deploy.
            </p>
            <div className="space-y-12">
              {FLOW_STEPS.map(({ step, title, description, icon: Icon, mockLabel }) => (
                <div
                  key={step}
                  className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
                    {step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-text-primary flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      {title}
                    </h3>
                    <p className="text-text-secondary text-sm mt-1">{description}</p>
                    <div className="mt-4 sm:hidden">
                      <MockBrowserFrame
                        label={mockLabel}
                        sublabel=""
                        route=""
                        className="opacity-90"
                      />
                    </div>
                  </div>
                  <div className="hidden sm:block w-48 flex-shrink-0">
                    <MockBrowserFrame
                      label={mockLabel}
                      sublabel=""
                      route=""
                      className="opacity-90"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start building with GRIP
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Use cases — user POV */}
        <section className="px-4 py-16 sm:py-20 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-4">
              Use cases
            </h2>
            <p className="text-text-secondary text-center max-w-xl mx-auto mb-12">
              From your point of view: what you want, and how GRIP helps.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {USE_CASES.map((uc, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-border bg-background-secondary/50 hover:border-primary/30 transition-colors"
                >
                  <h3 className="font-semibold text-text-primary mb-2">{uc.title}</h3>
                  <p className="text-sm text-text-secondary mb-4">{uc.description}</p>
                  <Link href={uc.href}>
                    <Button variant={i === 0 ? 'default' : 'outline'} size="sm" className="gap-1">
                      {uc.cta}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mock images — each page */}
        <section className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-4">
              See the app
            </h2>
            <p className="text-text-secondary text-center max-w-xl mx-auto mb-12">
              Mock previews of the main screens. Once you’re in, you’ll have the full flow: dashboard, project setup, repo, develop (chat), preview, and ship.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOCK_SCREENS.map((screen, i) => (
                <MockBrowserFrame
                  key={i}
                  label={screen.label}
                  sublabel={screen.sublabel}
                  route={screen.route}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6">
              Replace these with real screenshots when you’re ready for launch. The flow stays: Dashboard → Create project → Repo → Develop → Preview → Export / Deploy.
            </p>
            <div className="text-center mt-8">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Get started free
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Three pillars — keep original value props */}
        <section className="px-4 py-16 sm:py-20 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-12">
              Why GRIP
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
              <div className="flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <FolderGit2 className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Link any repo</h3>
                <p className="text-sm text-text-secondary">
                  Connect a GitHub repo. GRIP analyzes structure and code so you can build on a real codebase, not a blank slate.
                </p>
              </div>
              <div className="flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <MessageSquare className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Chat with GRIP</h3>
                <p className="text-sm text-text-secondary">
                  Get code, file generation, and step-by-step guidance. Save to project with one click; build progress stays in sync.
                </p>
              </div>
              <div className="flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <Zap className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Ship it</h3>
                <p className="text-sm text-text-secondary">
                  Preview in StackBlitz, then export to GitHub or deploy to Vercel. Idea to live product in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 sm:py-20 border-t border-border bg-primary/5">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
              Ready to build with GRIP?
            </h2>
            <p className="text-text-secondary mb-8">
              Create a project, link a repo, and chat with GRIP to turn your idea into a runnable app. No credit card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Get started free
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
