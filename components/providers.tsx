'use client'

/**
 * Client-side providers wrapper
 *
 * Wraps the app with necessary context providers:
 * - ToastProvider for notifications
 * - HighlightProvider for champion grid highlighting
 */

import { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { HighlightProvider } from '@/lib/contexts/highlight-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HighlightProvider>
        {children}
      </HighlightProvider>
    </ToastProvider>
  )
}
