'use client'

export default function TasksLayout({
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