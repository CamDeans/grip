'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { MessageSquare, FolderGit2, Zap } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      <header className="border-b border-border bg-background-secondary/50">
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

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 max-w-2xl">
          Your AI development partner
        </h1>
        <p className="text-lg text-text-secondary max-w-xl mb-2">
          G.R.I.P. (Guided Real-time Intelligence Partner) helps you turn GitHub repos and ideas into runnable, deployable products.
        </p>
        <p className="text-sm text-text-muted max-w-lg mb-10">
          Create projects, link repos, chat with G.R.I.P. AI, explore every file, and ship to production.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get started free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl text-left">
          <div className="flex flex-col items-start p-4 rounded-lg border border-border bg-background-secondary/50">
            <FolderGit2 className="h-8 w-8 text-primary mb-2" aria-hidden />
            <h3 className="font-semibold text-text-primary mb-1">Link any repo</h3>
            <p className="text-sm text-text-secondary">
              Connect a GitHub repo. G.R.I.P. analyzes every folder and file so you can make it yours.
            </p>
          </div>
          <div className="flex flex-col items-start p-4 rounded-lg border border-border bg-background-secondary/50">
            <MessageSquare className="h-8 w-8 text-primary mb-2" aria-hidden />
            <h3 className="font-semibold text-text-primary mb-1">Chat with G.R.I.P.</h3>
            <p className="text-sm text-text-secondary">
              Get code ideas, file generation, and step-by-step guidance. All in your project context.
            </p>
          </div>
          <div className="flex flex-col items-start p-4 rounded-lg border border-border bg-background-secondary/50">
            <Zap className="h-8 w-8 text-primary mb-2" aria-hidden />
            <h3 className="font-semibold text-text-primary mb-1">Ship it</h3>
            <p className="text-sm text-text-secondary">
              Run builds, explore the repo, and when you&apos;re ready—export and deploy to a live product.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-sm text-text-muted">
        G.R.I.P. — Guided Real-time Intelligence Partner. Built to help developers ship.
      </footer>
    </div>
  )
}
