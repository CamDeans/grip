'use client'

import { useState } from 'react'
import { UserCircleIcon } from '@heroicons/react/24/outline'

interface Collaborator {
  _id: string
  name: string
  email: string
}

export function CollaboratorList({ projectId }: { projectId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Failed to add collaborator')
      }

      const updatedResponse = await fetch(`/api/projects/${projectId}/collaborators`)
      const updatedCollaborators = await updatedResponse.json()
      setCollaborators(updatedCollaborators)
      setEmail('')
    } catch (error) {
      console.error('Error adding collaborator:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-text-primary">Collaborators</h3>
        <div className="mt-2">
          <form onSubmit={handleAddCollaborator} className="flex gap-x-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      <ul role="list" className="divide-y divide-border">
        {collaborators.map((collaborator) => (
          <li key={collaborator._id} className="flex py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <UserCircleIcon className="h-8 w-8 text-text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{collaborator.name}</p>
                <p className="text-sm text-text-secondary">{collaborator.email}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
