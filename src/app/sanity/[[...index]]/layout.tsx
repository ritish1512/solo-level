import React from 'react'

export default function SanityStudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {children}
    </div>
  )
}
