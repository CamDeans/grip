'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { FlaskConical, ArrowRight, GitBranch, Zap, Shield } from 'lucide-react'
import Link from 'next/link'

/**
 * Updated Sandbox Landing Page
 * 
 * Sandboxes are now integrated into the main Projects flow.
 * This page explains the new approach and redirects users to create projects
 * where they can then create sandbox experiments.
 */
export default function LegalSandboxCreatePage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect to projects after a brief moment
    const timer = setTimeout(() => {
      router.push('/dashboard/projects')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            Sandbox Experiments - Now Integrated!
          </CardTitle>
          <CardDescription>
            Sandboxes are now part of your main Projects workflow. Create experiments directly from any project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">How Sandbox Experiments Work Now</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="px-3 py-1 bg-primary/20 text-primary rounded-md text-sm font-semibold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Create or Open a Project</h4>
                  <p className="text-sm text-text-secondary">
                    Go to <strong>Projects</strong> and create a new project or open an existing one.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="px-3 py-1 bg-primary/20 text-primary rounded-md text-sm font-semibold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Create Sandbox Experiments</h4>
                  <p className="text-sm text-text-secondary">
                    On any project's Overview page, use the <strong>"Sandbox Experiments"</strong> section to create isolated environments for testing new features, architectures, or refactors.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="px-3 py-1 bg-primary/20 text-primary rounded-md text-sm font-semibold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Work Seamlessly</h4>
                  <p className="text-sm text-text-secondary">
                    Sandbox experiments appear in your Projects list and work with all GRIP features (chat, analysis, planning, preview) while keeping your main project safe.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border">
              <CardContent className="pt-6">
                <GitBranch className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Architecture Experiments</h4>
                <p className="text-xs text-text-secondary">
                  Try new patterns without breaking your main project.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-6">
                <Zap className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Risky Refactors</h4>
                <p className="text-xs text-text-secondary">
                  Test major changes in isolation before committing.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-6">
                <Shield className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Legal-Safe Mode</h4>
                <p className="text-xs text-text-secondary">
                  Strict clean-room generation for compliance needs.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={() => router.push('/dashboard/projects')} className="flex-1">
              Go to Projects
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button onClick={() => router.push('/dashboard/projects/new')} variant="outline">
              Create New Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
