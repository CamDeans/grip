'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import {
  MessageSquare,
  FolderGit2,
  Zap,
  Lightbulb,
  Play,
  Rocket,
  ChevronRight,
  ChevronDown,
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
import { FullLogo } from '@/components/ui/FullLogo'

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

const stagger = (delay = 0.05) => ({
  animate: {
    transition: { staggerChildren: delay, delayChildren: 0.1 },
  },
})

function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Types out text with a blinking cursor. */
function TypingEffect({
  text,
  speed = 70,
  delay = 0,
  cursorChar = '|',
  className,
}: {
  text: string
  speed?: number
  delay?: number
  cursorChar?: string
  className?: string
}) {
  const [display, setDisplay] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    let cancelled = false
    const start = () => {
      let i = 0
      setDisplay('')
      const type = () => {
        if (cancelled || i >= text.length) return
        setDisplay(text.slice(0, i + 1))
        i++
        setTimeout(type, speed)
      }
      setTimeout(type, delay)
    }
    start()
    return () => { cancelled = true }
  }, [text, speed, delay])

  useEffect(() => {
    const t = setInterval(() => setShowCursor((c) => !c), 530)
    return () => clearInterval(t)
  }, [])

  return (
    <span className={cn('inline', className)}>
      {display}
      <span className={cn('grip-typing-cursor inline-block align-middle transition-opacity duration-150', showCursor ? 'opacity-100' : 'opacity-30')}>
        {cursorChar}
      </span>
    </span>
  )
}

/** Rotates through phrases with type + pause + delete effect. */
function RotatingTypingEffect({
  phrases,
  typingSpeed = 80,
  pauseMs = 2200,
  deleteSpeed = 45,
  className,
}: {
  phrases: string[]
  typingSpeed?: number
  pauseMs?: number
  deleteSpeed?: number
  className?: string
}) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [display, setDisplay] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  const current = phrases[phraseIndex % phrases.length]

  useEffect(() => {
    let cancelled = false
    if (!isDeleting) {
      if (display.length < current.length) {
        const t = setTimeout(() => setDisplay(current.slice(0, display.length + 1)), typingSpeed)
        return () => { clearTimeout(t); cancelled = true }
      }
      const t = setTimeout(() => setIsDeleting(true), pauseMs)
      return () => clearTimeout(t)
    }
    if (display.length > 0) {
      const t = setTimeout(() => setDisplay(display.slice(0, -1)), deleteSpeed)
      return () => clearTimeout(t)
    }
    setIsDeleting(false)
    setPhraseIndex((i) => i + 1)
    return () => { cancelled = true }
  }, [current, display, isDeleting, typingSpeed, pauseMs, deleteSpeed])

  useEffect(() => {
    const t = setInterval(() => setShowCursor((c) => !c), 530)
    return () => clearInterval(t)
  }, [])

  return (
    <span className={cn('inline min-h-[1.5em]', className)}>
      {display}
      <span className={cn('inline-block text-primary align-middle transition-opacity duration-150', showCursor ? 'opacity-100' : 'opacity-30')}>
        |
      </span>
    </span>
  )
}

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
    description: 'GRIP runs analysis, generates the plan, and writes code for each file in one run. All files are built with code from your ideation and repo patterns—clean-room implementation that follows the repo\'s structure and patterns. No extra clicks; everything shows in Develop → Show Context.',
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
        'grip-card-glow rounded-lg border border-border bg-background-secondary/80 overflow-hidden',
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

const FAQ_ITEMS = [
  {
    q: 'What are the project creation steps?',
    a: 'Create a project (name + description) → select a GitHub repo (required—GRIP analyzes it and uses its structure and patterns) → answer ideation questions (goals, audience, key features, technical needs) → GRIP runs analysis, generates the plan, and writes code for each file in one run → develop with GRIP in chat (code applied and build runs automatically) → preview in StackBlitz → export to GitHub or deploy to Vercel.',
  },
  {
    q: 'Do I need GitHub? Is it required?',
    a: 'Yes. A GitHub repository is required when you create a project. GRIP analyzes the repo and uses its structure and patterns to guide your build—that analysis is core to how GRIP works. Any public repo works; you don\'t need to own it. GRIP uses it as reference only and never copies code.',
  },
  {
    q: 'Can I use a GitHub repo I don\'t own?',
    a: 'Yes. You can use any public GitHub repo as reference. It doesn\'t have to be yours. GRIP uses it only to understand structure, patterns, and dependencies so it can help you build your ideation. GRIP never copies code from the repo—all generated code is new, clean-room implementation that follows those patterns.',
  },
  {
    q: 'How does GRIP use the linked repo?',
    a: 'Reference only. GRIP analyzes the repo\'s structure, file organization, and dependencies to inform your project and generate new code that follows similar patterns. No code is copied from the repo. Your project is built from your ideation; the repo simply helps GRIP match the style and architecture you want.',
  },
  {
    q: 'What use cases does GRIP support?',
    a: 'Every project starts with a GitHub repo: link any public repo so GRIP analyzes it and uses its structure and patterns. Non-technical: use plain language; GRIP guides you and applies code automatically. Developers: add technical details, stack preferences, or architecture notes in ideation—GRIP uses both simple and detailed input. Safe experimentation: use the Sandbox Playground to try changes without touching your main project, then promote when ready.',
  },
  {
    q: 'Why paid plans only?',
    a: 'Paid plans only—no freemium. Your subscription covers real AI usage so you get predictable pricing and enough tokens to ship. No hidden fees; your token allowance is used for all GRIP AI actions (chat, code gen, builds).',
  },
  {
    q: 'How do I get started?',
    a: 'New here? Create your account first, then sign in and choose a plan to pay via Stripe. We\'ll guide you through each step. Already have an account? Sign in to go to your dashboard.',
  },
  {
    q: 'What uses tokens?',
    a: 'Enhanced chat (project chat with GRIP), project and legal-sandbox chat, editing files from chat, repo summarization, plan generation (main and sandbox), AI keyword generation, repository analysis and code suggestions, chat completion and legacy chat. Your plan\'s allowance resets each billing cycle.',
  },
  {
    q: 'How do I choose a plan?',
    a: 'Create your account and sign in first; then you\'ll choose a plan and pay via Stripe. Starter ($19/mo, 2.3M tokens), Pro ($49/mo, 6M tokens), or Team ($99/mo, 12M tokens). Your token allowance covers all AI usage so you can ship without surprises.',
  },
  {
    q: 'What happens when I run out of tokens?',
    a: 'When you hit your monthly limit, GRIP will prompt you to upgrade your plan (e.g. Starter → Pro or Team) or buy a one-time token add-on. Add-ons top up your current period so you can keep building without waiting for the next cycle.',
  },
  {
    q: 'What token add-ons are available and how much do they cost?',
    a: 'We offer one-time token packs: 500K tokens and 1M tokens. Pricing is shown on the Plans page when you\'re signed in and when you run out of tokens (/plans). You can buy a pack at any time to add tokens to your current billing period.',
  },
]

export function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      <header className="border-b border-border bg-background-secondary/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="logo logo-glow flex items-center shrink-0" aria-label="G.R.I.P. home">
            <FullLogo className="h-9 w-auto sm:h-10 w-auto" />
          </Link>
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
        <section className="relative px-4 py-16 sm:py-20 text-center max-w-4xl mx-auto overflow-hidden">
          {/* Background orbs — bold, eye-catching */}
          <motion.div
            aria-hidden
            className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/25 blur-[120px] pointer-events-none"
            animate={{
              x: [0, 40, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary/20 blur-[100px] pointer-events-none"
            animate={{
              x: [0, -50, 0],
              y: [0, 20, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border-2 border-primary/50 bg-primary/15 px-4 py-2.5 mb-8 grip-hero-tagline-badge shadow-[0_0_40px_-8px_var(--primary)]'
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="grip-hero-tagline font-extrabold">
              <TypingEffect
                text="GitHub Repo-Analysis Intellectual Partner"
                speed={55}
                delay={400}
                className="grip-hero-tagline"
              />
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-3 tracking-tight"
          >
            Your AI development partner
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-lg sm:text-xl text-primary font-semibold min-h-[2rem] mb-4"
          >
            <RotatingTypingEffect
              phrases={[
                'From idea to ship.',
                'Clean-room code generation.',
                'One flow. No juggling tools.',
                'Reference repos. Generate new code.',
              ]}
              typingSpeed={70}
              pauseMs={2400}
              deleteSpeed={40}
            />
          </motion.p>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            Turn GitHub repos and ideas into runnable, deployable products. Clean-room code generation—reference repos for patterns, generate new code. No juggling tools—one flow from idea to ship.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/get-started"
              className="grip-cta-glow inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-base font-medium bg-primary text-primary-foreground hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
            >
              Get started
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border-2 border-primary/30 px-8 text-base font-medium hover:border-primary/50 hover:shadow-[0_0_20px_-8px_var(--primary)] transition-all duration-300"
            >
              Sign in
            </Link>
            <Link
              href="#pricing"
              className="inline-flex h-11 items-center justify-center rounded-md border-2 border-primary/30 px-8 text-base font-medium hover:border-primary/50 hover:shadow-[0_0_20px_-8px_var(--primary)] transition-all duration-300"
            >
              Pricing
            </Link>
          </div>
          </div>
        </section>

        {/* Pricing — paid tiers & token usage */}
        <section id="pricing" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="grip-section-badge inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary mb-4">
                <DollarSign className="h-3.5 w-3.5" />
                Simple pricing
              </div>
              <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-4">
                Plans & token usage
              </h2>
              <p className="text-text-secondary max-w-2xl mx-auto mb-2">
                GRIP is paid-only so we can cover real AI API costs and give you predictable limits. No freemium—every plan includes a monthly token allowance for chat, code generation, and builds.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="grip-card-glow p-6 rounded-xl border-2 border-border bg-background-primary hover:border-primary/40 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg text-text-primary">Starter</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">$19<span className="text-sm font-normal text-text-muted">/month</span></p>
                <p className="text-sm text-text-secondary mb-4">2.3M tokens/month</p>
                <p className="text-sm text-text-muted">
                  Light use, side projects. Enough for regular chat and code generation without worrying about limits.
                </p>
              </div>
              <div className="grip-card-glow p-6 rounded-xl border-2 border-primary bg-primary/10 relative hover:scale-[1.02] transition-all duration-300">
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded shadow-[0_0_12px_-2px_var(--primary)]">Popular</div>
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg text-text-primary">Pro</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">$49<span className="text-sm font-normal text-text-muted">/month</span></p>
                <p className="text-sm text-text-secondary mb-4">6M tokens/month</p>
                <p className="text-sm text-text-muted">
                  Serious builders, daily use. Heavy development and multiple projects with plenty of headroom.
                </p>
              </div>
              <div className="grip-card-glow p-6 rounded-xl border-2 border-border bg-background-primary hover:border-primary/40 transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <Coins className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-lg text-text-primary">Team</h3>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">$99<span className="text-sm font-normal text-text-muted">/month</span></p>
                <p className="text-sm text-text-secondary mb-4">12M tokens/month</p>
                <p className="text-sm text-text-muted">
                  Small teams, heavy usage. Maximum allowance for shipping multiple apps and experiments.
                </p>
              </div>
            </div>

            {/* Token add-ons — when you reach your limit */}
            <div className="mt-12 p-6 rounded-xl border-2 border-border bg-background-primary">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg text-text-primary">Token add-ons</h3>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                When you reach your monthly limit, add more tokens without changing your plan. One-time packs are added to your current billing period.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background-secondary/50">
                  <span className="font-medium text-text-primary">500K tokens</span>
                  <span className="text-sm text-text-muted">One-time</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background-secondary/50">
                  <span className="font-medium text-text-primary">1M tokens</span>
                  <span className="text-sm text-text-muted">One-time</span>
                </div>
              </div>
              <p className="text-sm text-text-muted mt-4">
                Pricing and purchase on the <Link href="/plans" className="text-primary hover:underline">Plans</Link> page when you&apos;re signed in, or when you run out of tokens.
              </p>
            </div>

            <p className="text-center text-sm text-text-muted mt-6 max-w-xl mx-auto">
              <Link href="#faq" className="text-primary hover:underline">FAQ</Link> — plans, sign-up steps, and token usage.
            </p>
            <div className="text-center mt-6">
              <Link
                href="/get-started"
                className="grip-cta-glow inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-base font-medium bg-primary text-primary-foreground hover:scale-[1.03] active:scale-[0.98]"
              >
                Get started
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          </AnimatedSection>
        </section>

        {/* How it works — full app flow */}
        <section id="how-it-works" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-4">
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
              <Link href="#pricing" className="grip-cta-glow inline-flex h-11 items-center justify-center rounded-md border-2 border-primary/50 bg-primary/10 px-8 text-base font-medium text-primary hover:bg-primary/20 transition-all duration-300">
                See pricing
              </Link>
            </div>
          </div>
          </AnimatedSection>
        </section>

        {/* Use cases — user POV */}
        <section className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-4">
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
                    className="grip-card-glow group relative p-6 rounded-xl border border-border bg-background-primary hover:border-primary/50 transition-all duration-300"
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
              <Link href="#pricing" className="grip-cta-glow inline-flex h-11 items-center justify-center rounded-md border-2 border-primary/50 bg-primary/10 px-8 text-base font-medium text-primary hover:bg-primary/20 transition-all duration-300">
                See pricing
              </Link>
            </div>
          </div>
          </AnimatedSection>
        </section>

        {/* Mock images — each page */}
        <section className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <AnimatedSection>
          <div className="max-w-5xl mx-auto">
            <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-4">
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
              <Link href="#pricing" className="grip-cta-glow inline-flex h-11 items-center justify-center rounded-md border-2 border-primary/50 bg-primary/10 px-8 text-base font-medium text-primary hover:bg-primary/20 transition-all duration-300">
                See pricing
              </Link>
            </div>
          </div>
          </AnimatedSection>
        </section>

        {/* Sandbox Playground Section */}
        <section id="sandbox-playground" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="grip-section-badge inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-4 shadow-[0_0_20px_-6px_var(--primary)]">
                <FlaskConical className="h-3.5 w-3.5" />
                Safe Experimentation
              </div>
              <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-4">
                Sandbox Playground
              </h2>
              <p className="text-text-secondary max-w-xl mx-auto">
                Create isolated experiments without affecting your main project. Perfect for risky refactors, architecture changes, or testing new dependencies.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="grip-card-glow p-6 rounded-xl border border-border bg-background-secondary/50">
                <GitBranch className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-text-primary mb-2">Architecture Experiments</h3>
                <p className="text-sm text-text-secondary">
                  Try new patterns or structures (e.g., migrating from pages/ to app/ routes) without breaking your main project.
                </p>
              </div>
              <div className="grip-card-glow p-6 rounded-xl border border-border bg-background-secondary/50">
                <Zap className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-text-primary mb-2">Risky Refactors</h3>
                <p className="text-sm text-text-secondary">
                  Test major changes or new dependencies in isolation. When you're happy with the results, promote changes back to main.
                </p>
              </div>
              <div className="grip-card-glow p-6 rounded-xl border border-border bg-background-secondary/50">
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
            <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-12">
              Why GRIP
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
              <div className="grip-card-glow flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <FolderGit2 className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Reference repos, generate new code</h3>
                <p className="text-sm text-text-secondary">
                  Connect a GitHub repo for reference. GRIP analyzes structure, patterns, and dependencies—then generates clean-room code that follows those patterns. No code copying, only new implementation.
                </p>
              </div>
              <div className="grip-card-glow flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <MessageSquare className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Chat with GRIP</h3>
                <p className="text-sm text-text-secondary">
                  Get code, file generation, and step-by-step guidance. Code is automatically saved to your project, builds run automatically, and progress stays in sync.
                </p>
              </div>
              <div className="grip-card-glow flex flex-col items-center sm:items-start p-6 rounded-xl border border-border bg-background-secondary/50">
                <Zap className="h-10 w-10 text-primary mb-4" aria-hidden />
                <h3 className="font-semibold text-text-primary mb-2">Ship it</h3>
                <p className="text-sm text-text-secondary">
                  Preview in StackBlitz, then export to GitHub or deploy to Vercel. Idea to live product in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ — memos and extra details */}
        <section id="faq" className="px-4 py-16 sm:py-20 border-t border-border bg-background-secondary/30">
          <div className="max-w-2xl mx-auto">
            <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold text-center mb-8">
              Frequently asked questions
            </h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="grip-card-glow rounded-lg border border-border bg-background-primary overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-background-tertiary/50 transition-colors"
                    aria-expanded={faqOpen === i ? 'true' : 'false'}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 text-text-muted transition-transform', faqOpen === i && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {faqOpen === i && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-text-secondary leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 sm:py-20 border-t border-border bg-primary/5">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="grip-section-title text-2xl sm:text-3xl font-extrabold mb-4">
              Ready to build with GRIP?
            </h2>
            <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
              <Link href="#faq" className="text-primary hover:underline">FAQ</Link> — getting started, plans, and account steps.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/get-started"
                className="grip-cta-glow inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-base font-medium bg-primary text-primary-foreground hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
              >
                Get started
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md border-2 border-primary/30 px-8 text-base font-medium hover:border-primary/50 hover:shadow-[0_0_20px_-8px_var(--primary)] transition-all duration-300"
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
