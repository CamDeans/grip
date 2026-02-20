'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackAndDashboardNav } from '@/components/layout/BackAndDashboardNav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GradientTitle } from '@/components/ui/GradientTitle'
import { 
  BookOpenIcon, 
  CodeBracketIcon, 
  CommandLineIcon,
  CubeIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  UserIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

interface DocCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: DocSection[];
}

interface DocSection {
  id: string;
  title: string;
  description: string;
  path: string;
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const documentationCategories: DocCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Introduction and basic concepts of G.R.I.P.',
      icon: <RocketLaunchIcon className="h-6 w-6" />,
      sections: [
        {
          id: 'introduction',
          title: 'Introduction to G.R.I.P.',
          description: 'Learn about G.R.I.P. and how it helps streamline your development workflow',
          path: '/docs/getting-started',
        },
        {
          id: 'quick-start',
          title: 'Quick Start Guide',
          description: 'Get up and running with G.R.I.P. in minutes',
          path: '/docs/getting-started/quick-start',
        },
        {
          id: 'core-concepts',
          title: 'Core Concepts',
          description: 'Understand the fundamental concepts behind G.R.I.P.',
          path: '/docs/getting-started/concepts',
        }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      description: 'Detailed guides for G.R.I.P. features',
      icon: <PuzzlePieceIcon className="h-6 w-6" />,
      sections: [
        {
          id: 'project-planning',
          title: 'Project Planning',
          description: 'Learn how to plan your projects effectively with G.R.I.P.',
          path: '/docs/features/planning',
        },
        {
          id: 'enhanced-chat',
          title: 'Enhanced Chat',
          description: 'Leverage the power of contextual AI assistance',
          path: '/docs/features/enhanced-chat',
          badge: {
            text: 'Popular',
            variant: 'default',
          },
        },
        {
          id: 'code-generation',
          title: 'Code Generation',
          description: 'Generate high-quality code based on your project requirements',
          path: '/docs/features/code-generation',
        },
        {
          id: 'project-automation',
          title: 'Project Automation',
          description: 'Automate repetitive tasks in your development workflow',
          path: '/docs/features/automation',
        },
        {
          id: 'ideation-and-build',
          title: 'How Your Ideation Drives the Build',
          description: 'How goals, audience, features, and technical requirements are used in analysis, planning, and code generation',
          path: '/docs/features/ideation-and-build',
        }
      ]
    },
    {
      id: 'api',
      title: 'API Reference',
      description: 'Full API reference for the G.R.I.P. dashboard and integrators.',
      icon: <CodeBracketIcon className="h-6 w-6" />,
      sections: [
        {
          id: 'api-reference',
          title: 'API Reference',
          description: 'All endpoints (Projects, AI, Files, Chat, Support, Analytics), request/response examples, and authentication',
          path: '/docs/api',
        },
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect G.R.I.P. with other tools and services',
      icon: <CubeIcon className="h-6 w-6" />,
      sections: [
        {
          id: 'github-integration',
          title: 'GitHub Integration',
          description: 'Connect and work with your GitHub repositories',
          path: '/docs/integrations/github',
        },
        {
          id: 'mongodb-integration',
          title: 'MongoDB Integration',
          description: 'Store and retrieve project data with MongoDB',
          path: '/docs/integrations/mongodb',
        },
        {
          id: 'deploy-vercel',
          title: 'Deploy to Vercel & FAQs',
          description: 'Flow, instructions, and FAQs for devs and non-devs',
          path: '/docs/integrations/deploy-vercel',
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced Guides',
      description: 'In-depth guides for production use',
      icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
      sections: [
        {
          id: 'advanced-overview',
          title: 'Advanced Guides Overview',
          description: 'Introduction to custom prompts, templates, and production checklist',
          path: '/docs/advanced',
        },
        {
          id: 'custom-prompts',
          title: 'Custom Prompts',
          description: 'GRIP memory and ideation updates for consistent AI behavior',
          path: '/docs/advanced/custom-prompts',
          badge: {
            text: 'Advanced',
            variant: 'outline',
          },
        },
        {
          id: 'project-templates',
          title: 'Project Templates',
          description: 'Use and create code templates for consistent output',
          path: '/docs/advanced/templates',
        },
        {
          id: 'production-checklist',
          title: 'Production Checklist',
          description: 'Security, deployment, and best practices for going to production',
          path: '/docs/advanced/production',
        }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Authentication, data, and API security in G.R.I.P.',
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      sections: [
        {
          id: 'security-overview',
          title: 'Security',
          description: 'How G.R.I.P. handles authentication, tokens, data storage, and API security',
          path: '/docs/security',
        },
      ]
    },
  ];

  // Filter categories and sections based on search query
  const filteredCategories = searchQuery
    ? documentationCategories
        .map(category => ({
          ...category,
          sections: category.sections.filter(section =>
            section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            section.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }))
        .filter(category => category.sections.length > 0)
    : documentationCategories;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader 
        title="Documentation" 
        description="Everything you need to know about G.R.I.P."
      />

      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search documentation..."
            className="w-full p-4 pr-12 rounded-lg border border-border bg-background-secondary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-secondary">
            <CommandLineIcon className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="h-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {category.icon}
                </div>
                <div>
                  <CardTitle>{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {category.sections.map((section) => (
                  <li key={section.id}>
                    <Link 
                      href={section.path}
                      className="block p-3 rounded-lg hover:bg-background-hover transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-text-primary">{section.title}</h3>
                          <p className="text-sm text-text-secondary mt-1">{section.description}</p>
                        </div>
                        {section.badge && (
                          <Badge variant={section.badge.variant}>
                            {section.badge.text}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BookOpenIcon className="h-6 w-6" />
              </div>
              <div>
                <GradientTitle as="h2">Need Help?</GradientTitle>
                <CardDescription>Other resources to help you get the most out of G.R.I.P.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                href="/support" 
                className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-hover transition-colors"
              >
                <h3 className="font-medium flex items-center">
                  <CodeBracketIcon className="h-5 w-5 mr-2 text-primary" />
                  Support ticket
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Create a ticket for domain setup, bugs, or questions.
                </p>
              </Link>
              <Link 
                href="https://github.com/GRIP-organization/GRIP/issues/new" 
                target="_blank"
                className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-hover transition-colors"
              >
                <h3 className="font-medium flex items-center">
                  <CodeBracketIcon className="h-5 w-5 mr-2 text-primary" />
                  Report an Issue
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Bug reports and feature requests on GitHub.
                </p>
              </Link>
              
              <Link 
                href="/dashboard/examples" 
                className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-hover transition-colors"
              >
                <h3 className="font-medium flex items-center">
                  <BookOpenIcon className="h-5 w-5 mr-2 text-primary" />
                  Example Projects
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Explore example projects built with G.R.I.P.
                </p>
              </Link>
              
              <Link 
                href="/dashboard/chat" 
                className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-background-hover transition-colors"
              >
                <h3 className="font-medium flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-primary" />
                  Ask G.R.I.P.
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Get immediate help from G.R.I.P.&apos;s AI assistant
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <BackAndDashboardNav backFallbackHref="/" backLabel="Back" />
    </div>
  );
} 