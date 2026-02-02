'use client'

import { useState, useRef, useEffect } from 'react'
import { useToast } from '../providers/ToastProvider'
import { LoadingState } from '../common/LoadingState'

interface Repository {
  id: number
  full_name: string
  description: string
}

interface Props {
  onSelect: (owner: string, repo: string) => void
}

export function RepositorySearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { showToast } = useToast()
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLButtonElement>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/github/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error('Failed to search repositories')
      }
      const data = await response.json()
      setRepositories(data)
      setSelectedIndex(-1)
    } catch (error) {
      showToast('Failed to search repositories', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!repositories.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < repositories.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault()
          const repo = repositories[selectedIndex]
          const [owner, repoName] = repo.full_name.split('/')
          onSelect(owner, repoName)
        }
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && resultsContainerRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [selectedIndex])

  return (
    <div className="bg-[#1B2531] rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-text-primary mb-2">
          Search GitHub Repository
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedIndex === -1) {
                handleSearch()
              } else {
                handleKeyDown(e)
              }
            }}
            className="flex-1 rounded-md border border-border bg-background-secondary text-text-primary px-4 py-2 text-sm focus:border-primary focus:ring-primary"
            placeholder="Enter repository name"
            aria-label="Repository search"
            aria-describedby="repo-search-desc"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Search
          </button>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : repositories.length > 0 && (
          <>
            <div 
              id="repo-search-desc" 
              className="text-sm text-text-muted mt-4 mb-2"
            >
              Select a repository:
            </div>
            <div 
              ref={resultsContainerRef}
              className="overflow-y-auto max-h-[400px] pr-2 mb-6"
              role="listbox"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              aria-labelledby="repo-search-desc"
              aria-label="Repository search results"
            >
              {repositories.map((repo, index) => (
                <button
                  key={repo.id}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  onClick={() => {
                    const [owner, repoName] = repo.full_name.split('/')
                    onSelect(owner, repoName)
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-4 rounded-lg border mb-2 last:mb-0 transition-colors ${
                    index === selectedIndex
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background-tertiary hover:border-primary'
                  }`}
                  role="option"
                  {...(index === selectedIndex ? { 'aria-selected': 'true' } : { 'aria-selected': 'false' })}
                >
                  <h5 className="text-sm font-medium text-text-primary">{repo.full_name}</h5>
                  {repo.description && (
                    <p className="mt-1 text-xs text-text-muted">{repo.description}</p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
