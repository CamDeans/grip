/**
 * Reference repositories per repo type for GRIP plan and chat prompts.
 * Used the same way as styling refs (shadcn/headlessui): injected in the middle
 * (plan context stack guidance) and in enhanced-chat so GRIP aligns with repo
 * analysis and uses these for patterns and structure only—never copy source.
 */

import type { RepoTypeCategory } from '@/lib/repoTypeDetection'

export interface ReferenceRepo {
  owner: string
  name: string
  label: string
}

/** Reference repos for data-heavy / admin / CRUD flows (Refine-style). */
export const DATA_REFERENCE_REPOS: ReferenceRepo[] = [
  { owner: 'refinedev', name: 'refine', label: 'Refine' },
]

/** Reference repos by repo type category; matches RepoTypeDetection output. */
export const REFERENCE_REPOS_BY_CATEGORY: Partial<Record<RepoTypeCategory, ReferenceRepo[]>> = {
  ai_ml_llm: [
    { owner: 'langchain-ai', name: 'langchain', label: 'LangChain' },
  ],
  ios_swift: [
    { owner: 'apple', name: 'sample-food-truck', label: 'SwiftUI sample' },
  ],
  android_kotlin: [
    { owner: 'android', name: 'nowinandroid', label: 'Now in Android' },
  ],
  full_stack_js: [], // UI refs (shadcn/headlessui) come from activeLayers; data from DATA_REFERENCE_REPOS
  web_js: [],
  python_general: [
    { owner: 'pypa', name: 'sampleproject', label: 'PyPA sample project' },
  ],
  go_backend: [
    { owner: 'golang-standards', name: 'project-layout', label: 'Go project layout' },
  ],
  rust: [
    { owner: 'rust-lang', name: 'rust-by-example', label: 'Rust by Example' },
  ],
  ruby: [
    { owner: 'rails', name: 'rails', label: 'Rails' },
  ],
  php: [
    { owner: 'laravel', name: 'laravel', label: 'Laravel' },
  ],
  dotnet: [
    { owner: 'dotnet', name: 'samples', label: '.NET samples' },
  ],
  game_web: [
    { owner: 'pmndrs', name: 'react-three-fiber', label: 'React Three Fiber' },
    { owner: 'pmndrs', name: 'drei', label: 'Drei (R3F helpers)' },
  ],
  cli_tool: [],
  generic: [],
}

/**
 * Build the "Reference repos for [label]: owner/repo1, owner/repo2. Use for patterns and structure only."
 * line for a given category. Returns empty string if no refs for that category.
 */
export function getReferenceReposGuidanceLine(
  category: RepoTypeCategory,
  label: string
): string {
  const repos = REFERENCE_REPOS_BY_CATEGORY[category]
  if (!repos?.length) return ''
  const refs = repos.map((r) => `${r.owner}/${r.name}`).join(', ')
  return `Reference repos for ${label}: ${refs}. Use for patterns and structure only; do not copy source.`
}
