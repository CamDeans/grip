'use client'

import { useParams } from 'next/navigation'
import { CodeGenerator } from '@/components/project/CodeGenerator'
import { ProjectNavigation } from '@/components/project/ProjectNavigation'

export default function CodeGeneratorPage() {
  const params = useParams<{ id: string }>()
  
  return (
    <div className="p-4">
      <ProjectNavigation />
      <h1 className="text-2xl font-bold mb-4">Code Generator</h1>
      <div className="mb-8">
        <CodeGenerator projectId={params.id} />
      </div>
    </div>
  )
} 