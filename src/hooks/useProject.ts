/**
 * Stub for useProject — tests mock this via jest.mock('@/hooks/useProject').
 * If used in app code, implement or re-export from the real project context hook.
 */
export function useProject(): {
  project: { id: string; title?: string; description?: string; repositoryUrl?: string; status?: string } | null
  loading: boolean
  error: Error | null
} {
  return { project: null, loading: true, error: null }
}
