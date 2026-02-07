import { FC } from 'react'

const Footer: FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background-secondary py-2 z-40 min-w-0 overflow-hidden">
      <div className="container mx-auto px-4 min-w-0">
        <div className="flex flex-wrap justify-between items-center gap-2">
          {/* System Status */}
          <div className="flex items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2"></div>
            <span className="text-xs text-text-muted">All Good</span>
          </div>

          {/* Copyright */}
          <div className="text-xs text-text-muted">
            ©{currentYear} G.R.I.P
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 