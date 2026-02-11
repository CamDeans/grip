'use client'

import Link from 'next/link'
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
  FlaskConical,
  Shield,
  Code2,
  Users,
  DollarSign,
  Coins,
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
    title: 'Link a GitHub repo (reference only)',
    description: 'Connect any public repo. GRIP analyzes its structure, patterns, and dependencies—using it as a reference only. All code GRIP generates is clean-room implementation, never copied from the repo.',
    icon: GitBranch,
    mockLabel: 'Repo · Analysis · Reference',
  },
  {
    step: 3,
    title: 'Plan & files — automatic',
    description: 'GRIP generates a development plan and starter files from your ideation and repo patterns. All code is newly generated—clean-room implementation that follows the repo\'s structure and patterns. No extra clicks; everything shows in Develop → Show Context.',
    icon: FileCode2,
    mockLabel: 'Plan & generated files',
  },
  {
    step: 4,
    title: 'Develop with GRIP in chat',
    description: 'Chat with GRIP to implement features, fix bugs, and add code. Code is automatically saved to your project, and builds run automatically. Build progress stays in sync.',
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
    icon: Code2,
    title: 'I have an idea and a repo',
    subtitle: 'Want an app, not a blank slate',
    description: 'You found a GitHub template or starter you like. GRIP analyzes its patterns and generates new code that follows those patterns. Chat to refine; code is automatically saved and builds run automatically.',
  },
  {
    icon: Users,
    title: "I'm not very technical",
    subtitle: 'But I want to ship something',
    description: 'Describe what you want in simple terms. GRIP guides you step by step, generates code that\'s automatically saved, runs builds automatically, and opens StackBlitz so you can see the app run. No local install required.',
  },
  {
    icon: FlaskConical,
    title: 'I want to experiment safely',
    subtitle: 'Without breaking my main project',
    description: 'Use GRIP\'s Sandbox Playground to create isolated experiments. Try new architectures, risky refactors, or test dependencies—all in a separate environment. When you\'re happy, promote changes back to main.',
  },
  {
    icon: Rocket,
    title: 'I want one place',
    subtitle: 'From idea → running app → deployed',
    description: 'Create project, link repo, chat with GRIP, preview in StackBlitz, then export to GitHub or deploy to Vercel. The whole flow lives in GRIP so you don’t juggle tools.',
  },
] as const

const MOCK_SCREENS = [
  { label: 'Dashboard', sublabel: 'Your projects', route: 'Overview · Repo · Develop · Preview' },
  { label: 'Create project', sublabel: 'Name, repo, ideation', route: 'Goals · Audience · Features' },
  { label: 'Repo', sublabel: 'Reference & analysis', route: 'File tree · Patterns · Dependencies' },
  { label: 'Develop', sublabel: 'Chat with GRIP', route: 'Code blocks · Save to project · Build progress' },
  { label: 'Sandbox Develop', sublabel: 'Chat with GRIP in sandbox', route: 'Isolated builds · Promote to main' },
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
            <Link
              href="/admin/login"
              className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Sign in as admin
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/get-started"
              className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary-hover"
            >
              Get started
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
            Turn GitHub repos and ideas into runnable, deployable products. Clean-room code generation—reference repos for patterns, generate new code. No juggling tools—one flow from idea to ship.
          </p>
          <p className="text-sm text-text-muted max-w-xl mx-auto mb-10">
            Create projects, link repos for reference, chat with GRIP to generate new code that's automatically saved, experiment safely in sandbox playgrounds, watch builds run automatically, preview in StackBlitz, and export or deploy. Built for developers and makers who want to move fast.
          </p>
          <p className="text-xs text-text-muted max-w-lg mx-auto mb-2">
            Paid plans only—no freemium. Your subscription covers real AI usage so you get predictable pricing and enough tokens to ship.
          </p>
          <p className="text-xs text-text-muted max-w-lg mx-auto mb-6">
            New here? Create your account first, then sign in and choose a plan to pay via Stripe. We’ll guide you through each step.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/get-started"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-base font-medium bg-primary text-primary-foreground shadow hover:bg-primary-hover"
            >
              Get started
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border px-8 text-base font-medium hover:bg-background-hover"
            >
              Sign in
            </Link>
            <Link
              href="#pricing"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border px-8 text-base font-medium hover:bg-background-hover"
            >
              Pricing
            </Link>
          </div>
        </section>

        {/* Pricing — paid tiers & token usage */}
        <section id="pricing" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
                <DollarSign className="h-3.5 w-3.5" />
                Simple pricing
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                Plans & token usage
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto mb-2">
                GRIP is paid-only so we can cover real AI API costs and give you predictable limits. No freemium—every plan includes a monthly token allowance for chat, code generation, and builds.
              </p>
              <p className="text-sm text-text-muted max-w-xl mx-auto">
                <strong>Tokens</strong> are used when you chat with GRIP, generate code, or run builds. Your plan’s allowance resets each billing cycle. Choose the tier that matches how much you build.
              </p>
              <div className="mt-6 p-4 rounded-lg bg-background-primary border border-border text-left max-w-2xl mx-auto">
                <p className="text-xs font-semibold text-text-primary mb-2">What uses tokens:</p>
                <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
                  <li>Enhanced chat (project chat with GRIP)</li>
                  <li>Project and legal-sandbox chat</li>
                  <li>Editing files from chat (update-from-chat)</li>
                  <li>Repo summarization</li>
                  <li>Plan generation (main and sandbox)</li>
                  <li>AI keyword generation</li>
                  <li>Repository analysis and code suggestions</li>
                  <li>Chat completion and legacy chat</li>
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border-2 border-border bg-background-primary hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg text-text-primary">Starter</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">$19<span className="text-sm font-normal text-text-muted">/month</span></p>
                <p className="text-sm text-text-secondary mb-4">50,000 tokens/month</p>
                <p className="text-sm text-text-muted">
                  Light use, side projects. Enough for regular chat and code generation without worrying about limits.
                </p>
              </div>
              <div className="p-6 rounded-xl border-2 border-primary bg-primary/10 relative">
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded">Popular</div>
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg text-text-primary">Pro</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">$49<span className="text-sm font-normal text-text-muted">/month</span></p>
                <p className="text-sm text-text-secondary mb-4">200,000 tokens/month</p>
                <p className="text-sm text-text-muted">
                  Serious builders, daily use. Four times the tokens for heavy development and multiple projects.
                </p>
              </div>
              <div className="p-6 rounded-xl border-2 border-border bg-background-primary hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg text-text-primary">Team</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">$99<span className="text-sm font-normal text-text-muted">/month</span></p>
                <p className="text-sm text-text-secondary mb-4">500,000 tokens/month</p>
                <p className="text-sm text-text-muted">
                  Small teams, heavy usage. Maximum allowance for shipping multiple apps and experiments.
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-text-muted mt-6 max-w-xl mx-auto">
              Create your account and sign in first; then you’ll choose a plan and pay via Stripe. Your token allowance is used for all GRIP AI actions (chat, code gen, builds). No hidden fees.
            </p>
            <div className="text-center mt-6">
              <Link
                href="/get-started"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-base font-medium bg-primary text-primary-foreground shadow hover:bg-primary-hover"
              >
                Get started
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works — full app flow */}
        <section id="how-it-works" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-4">
              How GRIP works
            </h2>
            <p className="text-text-secondary text-center max-w-xl mx-auto mb-12">
              One clear path: create project → link repo (reference only) → GRIP generates new code → develop with GRIP → experiment in sandbox → preview → export or deploy.
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
              <Link href="#pricing" className="inline-flex h-11 items-center justify-center rounded-md border border-border px-8 text-base font-medium hover:bg-background-hover">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Use cases — user POV */}
        <section className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-4">
              Use cases
            </h2>
            <p className="text-text-secondary text-center max-w-xl mx-auto mb-12">
              From your point of view: what you want, and how GRIP helps.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {USE_CASES.map((uc, i) => {
                const Icon = uc.icon
                return (
                  <div
                    key={i}
                    className="group relative p-6 rounded-xl border border-border bg-background-primary hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary mb-1 text-base leading-tight">
                          {uc.title}
                        </h3>
                        <p className="text-xs text-primary font-medium mb-3">{uc.subtitle}</p>
                        <p className="text-sm text-text-secondary leading-relaxed">{uc.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-center">
              <Link href="#pricing" className="inline-flex h-11 items-center justify-center rounded-md border border-border px-8 text-base font-medium hover:bg-background-hover">
                See pricing
              </Link>
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
            <div className="text-center mt-8">
              <Link href="#pricing" className="inline-flex h-11 items-center justify-center rounded-md border border-border px-8 text-base font-medium hover:bg-background-hover">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Sandbox Playground Section */}
        <section id="sandbox-playground" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 mb-4">
                <FlaskConical className="h-3.5 w-3.5" />
                Safe Experimentation
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                Sandbox Playground
              </h2>
              <p className="text-text-secondary max-w-xl mx-auto">
                Create isolated experiments without affecting your main project. Perfect for risky refactors, architecture changes, or testing new dependencies.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
                <GitBranch className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-text-primary mb-2">Architecture Experiments</h3>
                <p className="text-sm text-text-secondary">
                  Try new patterns or structures (e.g., migrating from pages/ to app/ routes) without breaking your main project.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
                <Zap className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-text-primary mb-2">Risky Refactors</h3>
                <p className="text-sm text-text-secondary">
                  Test major changes or new dependencies in isolation. When you're happy with the results, promote changes back to main.
                </p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-text-primary mb-2">Legal-Safe Mode</h3>
                <p className="text-sm text-text-secondary">
                  Strict clean-room generation—repo is reference only, all code is new. Perfect for compliance and avoiding licensing issues.
                </p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <p className="text-sm text-text-secondary mb-4">
                Sandbox experiments are completely isolated. Build, test, and iterate safely. When ready, promote successful changes to your main project with one click.
              </p>
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
                <h3 className="font-semibold text-text-primary mb-2">Reference repos, generate new code</h3>
                <p className="text-sm text-text-secondary">
                  Connect a GitHub repo for reference. GRIP analyzes structure, patterns, and dependencies—then generates clean-room code that follows those patterns. No code copying, only new implementation.
                </p>
              </div>
              <div className="flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <MessageSquare className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Chat with GRIP</h3>
                <p className="text-sm text-text-secondary">
                  Get code, file generation, and step-by-step guidance. Code is automatically saved to your project, builds run automatically, and progress stays in sync.
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
              Create a project, link a repo for reference, and chat with GRIP to generate new code and turn your idea into a runnable app. Experiment safely in sandbox playgrounds. Choose a paid plan—your token allowance covers all AI usage so you can ship without surprises.
            </p>
            <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
              New? Get started and we'll guide you through account, sign-in, and plan. Already have an account? Sign in to go to your dashboard. We’ll guide you through each step.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/get-started"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-base font-medium bg-primary text-primary-foreground shadow hover:bg-primary-hover"
              >
                Get started
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border px-8 text-base font-medium hover:bg-background-hover"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
