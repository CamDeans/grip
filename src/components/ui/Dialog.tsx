'use client'

import { Fragment, type ReactNode } from 'react'
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '.'
import { cn } from '@/lib/utils'

/** Composable Dialog (Radix-style): open, onOpenChange, children with DialogContent/DialogHeader/DialogTitle. Accepts open or isOpen for compatibility. */
export function Dialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  children,
}: {
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  children: ReactNode
}) {
  const isVisible = open ?? isOpen ?? false
  const show = Boolean(isVisible)
  const handleClose = () => {
    onOpenChange?.(false)
    onClose?.()
  }
  return (
    <Transition.Root show={show} as={Fragment}>
      <HeadlessDialog
        as="div"
        className="relative z-50"
        onClose={handleClose}
      >
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
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              {children}
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: { className?: string; children?: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <HeadlessDialog.Panel
      className={cn(
        'relative w-full transform rounded-lg bg-background border border-border p-6 text-left shadow-xl transition-all',
        className
      )}
      {...props}
    >
      {children}
    </HeadlessDialog.Panel>
  )
}

export function DialogHeader({ className, children, ...props }: { className?: string; children?: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogTitle({ className, children, ...props }: { className?: string; children?: ReactNode } & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <HeadlessDialog.Title as={Fragment}>
      <h2 className={cn('text-lg font-semibold leading-none tracking-tight text-text-primary', className)} {...props}>
        {children}
      </h2>
    </HeadlessDialog.Title>
  )
}

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  type?: 'info' | 'warning' | 'error'
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'danger'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  primaryAction,
  secondaryAction,
}: AlertDialogProps) {
  const icons = {
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon,
  }

  const Icon = icons[type]
  const iconColors = {
    info: 'text-primary-500',
    warning: 'text-yellow-500',
    error: 'text-destructive',
  }

  const show = Boolean(isOpen)
  return (
    <Transition.Root show={show} as={Fragment}>
      <HeadlessDialog
        as="div"
        className="relative z-50"
        onClose={onClose}
      >
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

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <HeadlessDialog.Panel className="relative w-full max-w-md transform rounded-lg bg-background-secondary border border-border-default p-6 text-left shadow-xl transition-all">
                <div className="flex items-start">
                  {Icon && (
                    <div className={`mr-4 ${iconColors[type]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <HeadlessDialog.Title className="text-lg font-medium text-text-primary">
                      {title}
                    </HeadlessDialog.Title>
                    {description && (
                      <div className="mt-2">
                        <p className="text-sm text-text-secondary">
                          {description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {(primaryAction || secondaryAction) && (
                  <div className="mt-6 flex justify-end gap-3">
                    {secondaryAction && (
                      <Button
                        variant="secondary"
                        onClick={secondaryAction.onClick}
                      >
                        {secondaryAction.label}
                      </Button>
                    )}
                    {primaryAction && (
                      <Button
                        variant={primaryAction.variant === 'danger' ? 'danger' : 'default'}
                        onClick={primaryAction.onClick}
                      >
                        {primaryAction.label}
                      </Button>
                    )}
                  </div>
                )}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  )
}
