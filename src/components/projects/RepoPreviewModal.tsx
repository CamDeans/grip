'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { cn } from '@/lib/client-utils'

export interface RepoPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  owner: string
  repo: string
  repoFullName: string
  onConfirmAndContinue: (repo: { owner: string; name: string }) => void
}

export function RepoPreviewModal({
  isOpen,
  onClose,
  owner,
  repo,
  repoFullName,
  onConfirmAndContinue,
}: RepoPreviewModalProps) {
  const [readme, setReadme] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'readme' | 'images'>('readme')

  useEffect(() => {
    if (!isOpen || !owner || !repo) return
    setReadme('')
    setImageUrls([])
    setError(null)
    setConfirmed(false)
    setImageIndex(0)
    setActiveTab('readme')
    setLoading(true)
    fetch(`/api/github/repo-readme?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'No README found' : 'Failed to load')
        return res.json()
      })
      .then((data) => {
        setReadme(data.readme || '')
        setImageUrls(data.imageUrls || [])
      })
      .catch((err) => setError(err.message || 'Could not load README'))
      .finally(() => setLoading(false))
  }, [isOpen, owner, repo])

  const handleConfirmRepo = () => setConfirmed(true)
  const handleContinue = () => {
    onConfirmAndContinue({ owner, name: repo })
    onClose()
  }

  const goPrevImage = () => setImageIndex((i) => (i <= 0 ? imageUrls.length - 1 : i - 1))
  const goNextImage = () => setImageIndex((i) => (i >= imageUrls.length - 1 ? 0 : i + 1))

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX)
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const delta = e.changedTouches[0].clientX - touchStart
    setTouchStart(null)
    if (Math.abs(delta) > 50) delta > 0 ? goPrevImage() : goNextImage()
  }

  return (
    <Transition show={isOpen}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-background-primary border border-border shadow-xl transition-all">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <Dialog.Title className="text-lg font-semibold text-text-primary">
                    {repoFullName} — Preview
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 text-text-secondary hover:bg-background-hover hover:text-text-primary"
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Tabs: README | Images */}
                <div className="flex border-b border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab('readme')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium',
                      activeTab === 'readme'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    README
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('images')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium',
                      activeTab === 'images'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <PhotoIcon className="h-5 w-5" />
                    Images ({imageUrls.length})
                  </button>
                </div>

                <div className="max-h-[55vh] min-h-[200px] overflow-hidden flex flex-col">
                  {loading ? (
                    <div className="flex flex-1 items-center justify-center p-8 text-text-secondary">
                      Loading README…
                    </div>
                  ) : error ? (
                    <div className="flex flex-1 items-center justify-center p-8 text-destructive">
                      {error}. You can still select this repo or choose another.
                    </div>
                  ) : activeTab === 'readme' ? (
                    <div className="flex-1 overflow-y-auto p-4">
                      {readme ? (
                        <div className="readme-content prose prose-sm prose-invert dark:prose-invert max-w-none text-text-primary prose-headings:font-semibold prose-headings:text-text-primary prose-p:text-text-primary prose-li:text-text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:max-h-10 prose-img:object-contain prose-pre:bg-background-tertiary prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:px-4 prose-pre:py-3 prose-pre:text-sm prose-pre:leading-relaxed prose-code:bg-background-tertiary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre_code:bg-transparent prose-pre_code:px-0 prose-pre_code:py-0 prose-pre:overflow-x-auto prose-table:text-sm prose-th:bg-background-tertiary prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:rounded-lg">
                          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>{readme}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-text-secondary">No README found for this repo.</p>
                      )}
                      <p className="mt-4 text-xs text-text-secondary">
                        <a
                          href={`https://github.com/${owner}/${repo}#readme`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Open README on GitHub →
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center p-4">
                      {imageUrls.length === 0 ? (
                        <p className="text-text-secondary">No images found in the README.</p>
                      ) : (
                        <>
                          <div
                            className="relative w-full max-w-lg aspect-video bg-background-tertiary rounded-lg overflow-hidden flex items-center justify-center touch-pan-y"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                          >
                            <img
                              src={imageUrls[imageIndex]}
                              alt={`Repo image ${imageIndex + 1}`}
                              className="max-w-full max-h-full object-contain select-none"
                              draggable={false}
                            />
                          </div>
                          <p className="text-xs text-text-secondary mt-1">Swipe left/right or use arrows to change image</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={goPrevImage}
                              icon={<ChevronLeftIcon className="h-5 w-5" />}
                              aria-label="Previous image"
                            />
                            <span className="text-sm text-text-secondary">
                              {imageIndex + 1} / {imageUrls.length}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={goNextImage}
                              icon={<ChevronRightIcon className="h-5 w-5" />}
                              aria-label="Next image"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Select another repo
                    </Button>
                    {!confirmed && (
                      <Button type="button" variant="default" onClick={handleConfirmRepo}>
                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                        Confirm this repo
                      </Button>
                    )}
                  </div>
                  {confirmed && (
                    <Button type="button" variant="default" onClick={handleContinue}>
                      Continue to next step
                      <ArrowRightIcon className="h-5 w-5 ml-1" />
                    </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
