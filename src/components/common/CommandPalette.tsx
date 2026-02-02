'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Combobox, Transition } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Projects', href: '/dashboard/projects' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Settings', href: '/dashboard/settings' },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        setIsOpen(!isOpen)
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const filteredNavigation = query === ''
    ? navigation
    : navigation.filter((item) => {
        return item.name.toLowerCase().includes(query.toLowerCase())
      })

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog onClose={setIsOpen} className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-black/25 transition-opacity" />
        </Transition.Child>

        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Combobox
            onChange={(item: any) => {
              setIsOpen(false)
              router.push(item.href)
            }}
          >
            <div className="mx-auto max-w-xl transform divide-y divide-border overflow-hidden rounded-xl bg-background-secondary shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-text-muted"
                  aria-hidden="true"
                />
                <Combobox.Input
                  className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-text-primary placeholder-text-muted focus:ring-0 sm:text-sm"
                  placeholder="Search..."
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              {filteredNavigation.length > 0 && (
                <Combobox.Options static className="max-h-72 scroll-py-2 overflow-y-auto py-2 text-sm text-text-primary">
                  {filteredNavigation.map((item) => (
                    <Combobox.Option
                      key={item.name}
                      value={item}
                      className={({ active }) =>
                        `cursor-default select-none px-4 py-2 ${
                          active ? 'bg-primary/10 text-primary' : 'text-text-muted'
                        }`
                      }
                    >
                      {item.name}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              )}
            </div>
          </Combobox>
        </Transition.Child>
      </Dialog>
    </Transition.Root>
  )
}
