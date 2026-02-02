export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-border border-t-primary"></div>
        <div className="mt-4 text-center text-sm text-text-muted">Loading...</div>
      </div>
    </div>
  )
}
