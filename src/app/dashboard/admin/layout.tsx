'use client'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="p-4 md:p-6">
      {children}
    </div>
  )
} 