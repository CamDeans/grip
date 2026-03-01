'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, SparklesIcon, XMarkIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { refreshTokenUsage } from '@/lib/tokenRefresh'
import { generateKeywords } from '@/lib/client/generateKeywords'
import { RepoPreviewModal } from '@/components/projects/RepoPreviewModal'

interface Repository {
  id: number
  name: string
  owner: {
    login: string
  }
  description: string
  language: string
}

export interface RepoSelectorIdeation {
  goals?: string
  targetAudience?: string
  keyFeatures?: string
  technicalRequirements?: string
}

interface RepoSelectorProps {
  onSelect: (repo: { owner: string; name: string } | null) => void
  /** Called when user confirms repo in preview popup and clicks "Continue to next step" (optional, e.g. advance to next page) */
  onConfirmAndContinue?: (repo: { owner: string; name: string }) => void
  projectTitle?: string
  projectDescription?: string
  /** Optional ideation context to improve keyword generation and repo match */
  ideation?: RepoSelectorIdeation
  id: string
}

export function RepoSelector({
  onSelect,
  onConfirmAndContinue,
  projectTitle = '',
  projectDescription = '',
  ideation,
  id,
}: RepoSelectorProps) {
  const [search, setSearch] = useState('')
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [previewRepo, setPreviewRepo] = useState<Repository | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [showKeywordsPopup, setShowKeywordsPopup] = useState(false)
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([])
  const [isProjectDataFilled, setIsProjectDataFilled] = useState(false)

  // Watch for changes in project title and description
  useEffect(() => {
    setIsProjectDataFilled(
      Boolean(projectTitle?.trim()) && Boolean(projectDescription?.trim())
    )
  }, [projectTitle, projectDescription])

  const searchRepositories = async () => {
    if (!search.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/github/search?q=${encodeURIComponent(search)}`)
      const data = await response.json()
      setRepos(data.items || [])
    } catch (error) {
      console.error('Error searching repositories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /** Open preview popup (pre-selection). Repo is only set when user confirms in popup and clicks Continue. */
  const handleOpenPreview = (repo: Repository) => {
    setPreviewRepo(repo)
  }

  /** User confirmed repo in popup and clicked "Continue to next step". */
  const handleConfirmAndContinueFromModal = (repo: { owner: string; name: string }) => {
    const fullRepo = repos.find((r) => r.owner.login === repo.owner && r.name === repo.name)
    if (fullRepo) setSelectedRepo(fullRepo)
    onSelect(repo)
    setPreviewRepo(null)
    onConfirmAndContinue?.(repo)
  }

  /** Reset search and repo list when user closes preview to select another repo. */
  const handleSelectAnotherRepo = () => {
    setPreviewRepo(null)
    setRepos([])
    setSearch('')
    setSelectedRepo(null)
  }

  const handleGenerateKeywords = async () => {
    if (!isProjectDataFilled) {
      alert('Please fill in both the project title and description before generating keywords')
      return
    }

    setRepos([])
    setSelectedRepo(null)
    setShowKeywordsPopup(false)
    setIsGeneratingKeywords(true)
    try {
      const keywords = await generateKeywords(projectTitle, projectDescription, ideation)
      setGeneratedKeywords(keywords)
      setShowKeywordsPopup(true)
      refreshTokenUsage()
    } catch (error) {
      console.error('Error generating keywords:', error)
      const message = error instanceof Error ? error.message : 'Failed to generate keywords. Please try again.'
      alert(message)
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  /** Add all suggested keywords to the search (used by "Use Keywords" button). */
  const handleUseKeywords = () => {
    setSearch(generatedKeywords.join(' '))
    setShowKeywordsPopup(false)
    setGeneratedKeywords([])
  }

  /** Add only the clicked keyword to the search. */
  const handleUseKeyword = (keyword: string) => {
    setSearch(keyword)
    setShowKeywordsPopup(false)
    setGeneratedKeywords([])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchRepositories())}
          placeholder="Search by keyword, topic, or owner/repo (e.g. react todo)"
          className="form-input min-w-0 w-full sm:flex-1 sm:w-auto"
          aria-label="Search GitHub repositories"
          id={id}
        />
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-none">
          <Button
            onClick={searchRepositories}
            isLoading={isLoading}
            disabled={!search.trim()}
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            aria-label="Search repositories"
            title="Search repositories (or press Enter)"
            variant="default"
            className="flex-1 sm:flex-none"
          >
            Search
          </Button>
          <Button
            onClick={handleGenerateKeywords}
            isLoading={isGeneratingKeywords}
            disabled={!isProjectDataFilled}
            icon={<SparklesIcon className="h-5 w-5" />}
            variant="default"
            aria-label="Generate keywords"
            title={!isProjectDataFilled ? "Fill in project title and description first" : "Generate keywords from your project details"}
            className="flex-1 sm:flex-none"
          >
            Generate Keywords
          </Button>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        Use <strong>Generate Keywords</strong> to get search suggestions from your title and description, then pick one or click <strong>Use Keywords</strong> to search with all. Press Enter in the box to run Search.
      </p>

      {showKeywordsPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-background-secondary border border-border-default rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between border-b border-border-default p-4">
              <h3 className="text-lg font-medium text-text-primary">Suggested Keywords</h3>
              <button
                onClick={() => setShowKeywordsPopup(false)}
                className="text-text-secondary hover:text-text-primary"
                aria-label="Close keywords popup"
                title="Close keywords popup"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-text-secondary">
                Based on your project details, here&apos;s the suggested search keywords:
              </p>

              <div className="flex flex-wrap gap-2">
                {generatedKeywords.map((keyword, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseKeyword(keyword)}
                    aria-label={`Use keyword: ${keyword}`}
                    title={`Use keyword: ${keyword}`}
                  >
                    {keyword}
                  </Button>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowKeywordsPopup(false)}
                  aria-label="Cancel keyword selection"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUseKeywords}
                  icon={<SparklesIcon className="h-5 w-5" />}
                  variant="default"
                  aria-label="Use selected keywords"
                >
                  Use Keywords
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {repos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-secondary">
            Click a repo to <strong>preview its README and images</strong> in a popup. Confirm there to select it, then use &quot;Continue to next step&quot; to proceed.
          </p>
          {(selectedRepo ? [selectedRepo] : repos).map((repo) => (
            <div
              key={repo.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                selectedRepo?.id === repo.id
                  ? 'border-[3px] border-transparent bg-gradient-to-r from-[#3b82f6]/20 to-[#8b5cf6]/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:shadow-[0_0_15px_rgba(139,92,246,0.3)] before:absolute before:inset-0 before:rounded-lg before:p-[3px] before:bg-gradient-to-r before:from-[#3b82f6] before:to-[#8b5cf6] relative before:-z-10'
                  : 'border-border-default hover:border-border-hover hover:bg-background-hover dark:hover:bg-background-tertiary'
              } cursor-pointer`}
              onClick={() => (selectedRepo?.id === repo.id ? undefined : handleOpenPreview(repo))}
              role="button"
              tabIndex={0}
              aria-label={selectedRepo?.id === repo.id ? `Selected: ${repo.owner.login}/${repo.name}` : `Preview repository: ${repo.owner.login}/${repo.name}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-medium ${
                    selectedRepo?.id === repo.id ? 'text-white' : 'text-primary-500/90 dark:text-white'
                  }`}>
                    {repo.owner.login}/{repo.name}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedRepo?.id === repo.id ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRepo(null)
                          onSelect(null)
                        }}
                      >
                        Change repo
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPreview(repo)
                        }}
                        icon={<DocumentMagnifyingGlassIcon className="h-4 w-4" />}
                        title="Preview README and images"
                      >
                        Preview
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-text-secondary dark:text-text-secondary">{repo.description}</p>
                {repo.language && (
                  <span className="text-xs text-text-secondary dark:text-text-secondary mt-1 inline-block bg-background-tertiary px-2 py-0.5 rounded-full">
                    {repo.language}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RepoPreviewModal
        isOpen={!!previewRepo}
        onClose={handleSelectAnotherRepo}
        onSelectAnother={handleSelectAnotherRepo}
        owner={previewRepo?.owner.login ?? ''}
        repo={previewRepo?.name ?? ''}
        repoFullName={previewRepo ? `${previewRepo.owner.login}/${previewRepo.name}` : ''}
        onConfirmAndContinue={handleConfirmAndContinueFromModal}
      />
    </div>
  )
}
