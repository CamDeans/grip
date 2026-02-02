'use client'

import { useState, useEffect } from 'react'
import { LoadingState } from '../common/LoadingState'
import { useToast } from '../providers/ToastProvider'

interface Repository {
  id: string
  full_name: string
  description: string
  owner: {
    login: string
  }
  name: string
}

interface Props {
  projectId: string
  autoAnalyze?: boolean
  initialAnalysis?: any
}

export function RepositoryAnalysis({ projectId, autoAnalyze, initialAnalysis }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [analysis, setAnalysis] = useState<string>(
    initialAnalysis?.projectOverview || initialAnalysis?.analysis || ''
  )
  const [isLoading, setIsLoading] = useState(false)
  const [analyzingRepoId, setAnalyzingRepoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    if (autoAnalyze && !analysis) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent)
    }
  }, [autoAnalyze])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setAnalysis('')

    try {
      const response = await fetch(`/api/github/search?q=${encodeURIComponent(searchQuery || projectId)}`)
      if (!response.ok) {
        throw new Error('Failed to search repositories')
      }
      const results = await response.json()
      setRepositories(results)

      if (autoAnalyze && results.length > 0) {
        await handleAnalyze(results[0].owner.login, results[0].name, results[0].id)
      }
    } catch (error) {
      console.error('Error searching repositories:', error)
      setError(error instanceof Error ? error.message : 'Failed to search repositories')
      showToast('Failed to search repositories', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async (owner: string, repo: string, repoId: string) => {
    setAnalyzingRepoId(repoId)
    setError('')

    try {
      const analysisResponse = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          owner,
          repo
        }),
      })

      if (!analysisResponse.ok) {
        throw new Error('Analysis failed')
      }

      const data = await analysisResponse.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      // Extract the analysis text from the response
      const analysisText = data.analysis?.projectOverview || 
                          (typeof data.analysis === 'string' ? data.analysis : 
                          JSON.stringify(data.analysis, null, 2))

      setAnalysis(analysisText)
      showToast('Analysis completed successfully', 'success')
    } catch (error) {
      console.error('Error analyzing repository:', error)
      setError(error instanceof Error ? error.message : 'Failed to analyze repository')
      showToast('Failed to analyze repository', 'error')
    } finally {
      setAnalyzingRepoId(null)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 mb-4">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {!autoAnalyze && (
        <form onSubmit={handleSearch} className="flex-shrink-0 mb-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-text-primary">
              Search GitHub Repositories
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1 block w-full rounded-md border-border bg-background-secondary text-text-primary shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      )}

      {repositories.length > 0 && !autoAnalyze && (
        <div className="flex-1 min-h-0">
          <h3 className="text-lg font-medium text-primary mb-4">Search Results</h3>
          <div className="overflow-y-auto h-[calc(100vh-24rem)]">
            <div className="grid grid-cols-1 gap-4 pr-2">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="relative rounded-lg border border-border bg-background-secondary px-6 py-5 shadow-sm hover:border-primary"
                >
                  <h4 className="text-lg font-medium text-text-primary">{repo.full_name}</h4>
                  <p className="mt-1 text-sm text-text-secondary">{repo.description}</p>
                  <button
                    onClick={() => handleAnalyze(repo.owner.login, repo.name, repo.id)}
                    disabled={analyzingRepoId === repo.id}
                    className="mt-4 inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    {analyzingRepoId === repo.id ? 'Analyzing...' : 'Analyze Repository'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-primary">Analysis Results</h3>
          <div className="mt-4 rounded-md bg-background-tertiary p-6 shadow overflow-y-auto max-h-[40vh]">
            <pre className="whitespace-pre-wrap text-sm text-text-primary">
              {analysis}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
