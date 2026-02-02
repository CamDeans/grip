'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '../providers/ToastProvider'
import { LoadingState } from '../common/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card/Card'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Registration failed')
      }

      showToast('Account created successfully', 'success')
      router.push('/login?registered=true')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Registration failed', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="logo text-3xl mb-2">G.R.I.P.</h1>
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">
            Create your account
          </h2>
        </div>
        <Card className="border-border shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-text-primary">
              Sign up
            </CardTitle>
            <CardDescription className="text-text-secondary">
              Enter your details to create an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label htmlFor="name" className="sr-only">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input rounded-t-md rounded-b-none"
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input rounded-none -mt-px"
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input rounded-b-md rounded-t-none -mt-px"
                  placeholder="Password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Sign up'}
              </Button>

              <div className="text-sm text-center">
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
