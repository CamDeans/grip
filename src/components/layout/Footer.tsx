import { FC } from 'react'
import Link from 'next/link'

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

          {/* Links + Copyright */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <Link href="/attributions" className="hover:text-primary">Attributions</Link>
            <span>©{currentYear} G.R.I.P</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 