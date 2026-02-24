/**
 * Stub for useAnalysis — tests mock this via jest.mock('@/hooks/useAnalysis').
 * Implement or re-export when analysis context is added.
 */
export function useAnalysis(): {
  analysis: unknown
  loading: boolean
  error: Error | null
} {
  return { analysis: null, loading: false, error: null }
}
