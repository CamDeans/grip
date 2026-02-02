import { useState, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { debounce } from 'lodash'

interface SearchResult {
  id: number
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
}

interface QuickSearchProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickSearch({ isOpen, onClose }: QuickSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const searchGitHub = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(
            query
          )}&sort=stars&order=desc`
        )
        const data = await response.json()
        setResults(data.items || [])
      } catch (error) {
        console.error('Error searching GitHub:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    searchGitHub(searchQuery)
  }, [searchQuery, searchGitHub])

  const handleRepoClick = (url: string) => {
    window.open(url, '_blank')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="search-modal" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-black dark:bg-black transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-2xl transform overflow-hidden rounded-lg bg-background-primary border border-border text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle scale-100 opacity-100">
          <div className="flex items-center border-b border-border p-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-text-muted" />
            <input
              type="text"
              className="flex-1 border-0 bg-transparent px-4 text-text-primary placeholder-text-muted focus:outline-none focus:ring-0"
              placeholder="Search GitHub repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto bg-background-primary p-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoClick(repo.html_url)}
                    className="w-full text-left p-3 rounded-lg hover:bg-background-tertiary transition-colors duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary group-hover:text-primary">
                        {repo.full_name}
                      </span>
                      <span className="text-sm text-text-muted">
                        ⭐ {repo.stargazers_count.toLocaleString()}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-sm text-text-muted line-clamp-2 mt-1">
                        {repo.description}
                      </p>
                    )}
                    {repo.language && (
                      <span className="text-xs text-text-muted mt-2 inline-block">
                        {repo.language}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-4 text-text-muted">
                No repositories found
              </div>
            ) : (
              <div className="text-center py-4 text-text-muted">
                Start typing to search GitHub repositories
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
