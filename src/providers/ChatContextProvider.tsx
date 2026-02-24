'use client'

import React from 'react'

/** Passthrough provider for chat context; add state here if needed. */
export function ChatContextProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
