import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'
import { Button } from '@/components/ui/Button'
import { ChevronRight, UserPlus, LogIn, CreditCard } from 'lucide-react'

/**
 * Get started flow: for users who land from the landing page and want to subscribe.
 * - Signed in with access → redirect to dashboard.
 * - Signed in without access → redirect to /plans (choose plan & pay).
 * - Not signed in → show 3 steps: Create account → Sign in → Choose plan & pay.
 */
export default async function GetStartedPage() {
  const session = await getServerAuthSession()
  if (session) {
    const access = await getAppAccess(session)
    if (access.hasAccess) redirect('/dashboard')
    redirect('/plans')
  }

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Get started with GRIP
          </h1>
          <p className="text-text-secondary">
            Follow these three steps to create your account, sign in, choose a plan, and complete payment. Then you’ll have full access to the app.
          </p>
        </div>

        <ol className="space-y-8">
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-primary font-bold">
              1
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Create your account
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Sign up with your email and a password. You’ll use these to sign in and manage your subscription.
              </p>
              <Link href="/register?callbackUrl=%2Fplans">
                <Button size="sm" className="gap-2">
                  Create account
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-primary font-bold">
              2
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                Sign in
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                After creating your account, sign in with the same email and password. We’ll take you straight to the plans page.
              </p>
              <Link href="/login?callbackUrl=%2Fplans">
                <Button variant="outline" size="sm" className="gap-2">
                  Sign in
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </li>

          <li className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-primary font-bold">
              3
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Choose a plan and pay
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                On the plans page, pick Starter, Pro, or Team and click Subscribe. You’ll complete payment securely via Stripe, then land in your dashboard with full access.
              </p>
              <p className="text-xs text-text-muted mb-4">
                Already have an account? Sign in above, then you’ll be able to go to the plans page and subscribe.
              </p>
              <Link href="/login?callbackUrl=%2Fplans">
                <Button variant="outline" size="sm" className="gap-2">
                  Sign in, then choose plan
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </li>
        </ol>

        <div className="mt-12 p-4 rounded-lg border border-border bg-background-secondary/50">
          <p className="text-sm font-medium text-text-primary mb-1">Why this order?</p>
          <p className="text-xs text-text-secondary">
            GRIP needs your account first so we can attach your subscription and token allowance to you. Once you’re signed in, the Subscribe button takes you to Stripe to pay; after payment, you’re all set.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
