'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/client-utils'
import { GradientTitle } from '@/components/ui/GradientTitle'
import { Button } from '.'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const maxWidthClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md'
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Background overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        {/* Modal panel: stay within viewport on all screen sizes; flex/wrap and scroll when needed */}
        <div className="fixed inset-0 overflow-auto max-h-[100dvh] max-w-[100vw] overscroll-contain">
          <div className="flex min-h-full min-w-0 max-w-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full min-w-0 max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] transform overflow-y-auto overflow-x-auto rounded-lg bg-background-secondary p-6 text-left align-middle shadow-xl transition-all flex flex-col',
                  maxWidthClasses[size]
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="space-y-1 min-w-0 flex-1">
                    <Dialog.Title as={Fragment}>
                      <GradientTitle as="h3">{title}</GradientTitle>
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="text-sm text-text-secondary break-words">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Close modal"
                    title="Close modal"
                    className="shrink-0"
                  >
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-4 min-h-0 min-w-0 flex-1 overflow-auto flex flex-col flex-wrap">{children}</div>

                {footer && (
                  <div className="mt-6 flex flex-wrap justify-end gap-2 shrink-0">{footer}</div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
