'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Coins } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const TIERS = [
  { id: 'starter', name: 'Starter', price: '$19', priceLabel: '/month', tokens: '650,000 tokens/month', description: 'Light use, side projects. Enough for regular chat and code generation without worrying about limits.', popular: false },
  { id: 'pro', name: 'Pro', price: '$49', priceLabel: '/month', tokens: '1.7M tokens/month', description: 'Serious builders, daily use. Heavy development and multiple projects with plenty of headroom.', popular: true },
  { id: 'team', name: 'Team', price: '$99', priceLabel: '/month', tokens: '3.4M tokens/month', description: 'Small teams, heavy usage. Maximum allowance for shipping multiple apps and experiments.', popular: false },
] as const

export function PlansPageClient() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handleSubscribe = async (tierId: string) => {
    setLoadingTier(tierId)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to start checkout', variant: 'destructive' })
        return
      }
      if (data.url) window.location.href = data.url
      else toast({ title: 'Error', description: 'No checkout URL returned', variant: 'destructive' })
    } catch (e) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h1 className="logo text-3xl sm:text-4xl mb-2">G.R.I.P.</h1>
          <p className="text-text-secondary mb-2">Choose a plan to access the app</p>
          <p className="text-sm text-text-muted max-w-xl mx-auto mb-2">
            You're signed in. Pick a plan below and click Subscribe—you'll complete payment securely via Stripe, then land in your dashboard with full access.
          </p>
          <p className="text-sm text-text-muted max-w-xl mx-auto">
            Your subscription includes a monthly token allowance for chat, code generation, and builds. Tokens reset each billing cycle.
          </p>
          <div className="mt-6 p-4 rounded-lg bg-background-secondary border border-border text-left max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-text-primary mb-2">What uses tokens:</p>
            <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
              <li>Enhanced chat (project chat with GRIP)</li>
              <li>Project and legal-sandbox chat</li>
              <li>Editing files from chat</li>
              <li>Repo summarization</li>
              <li>Plan generation (main and sandbox)</li>
              <li>AI keyword generation</li>
              <li>Repository analysis and code suggestions</li>
              <li>Chat completion and legacy chat</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`p-6 rounded-xl border-2 bg-background-primary relative transition-colors ${
                tier.popular ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded">
                  Popular
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <Coins className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg text-text-primary">{tier.name}</h3>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {tier.price}<span className="text-sm font-normal text-text-muted">{tier.priceLabel}</span>
              </p>
              <p className="text-sm text-text-secondary mb-4">{tier.tokens}</p>
              <p className="text-sm text-text-muted mb-4">{tier.description}</p>
              <Button
                size="sm"
                className="w-full"
                variant={tier.popular ? 'default' : 'outline'}
                disabled={!!loadingTier}
                onClick={() => handleSubscribe(tier.id)}
              >
                {loadingTier === tier.id ? 'Redirecting…' : 'Subscribe'}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-text-muted max-w-xl mx-auto mb-6">
          You’ll complete payment securely via Stripe. Your token allowance is used for all GRIP AI actions (chat, code gen, builds). No hidden fees.
        </p>
        <p className="text-center">
          <Link href="/" className="text-sm text-primary hover:underline">Back to home</Link>
        </p>
      </div>
    </div>
  )
}
