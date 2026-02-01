'use client'

/**
 * Toast Notification Component
 *
 * Shows animated toast messages for AI recommendations and insights.
 * Supports multiple concurrent toasts with auto-dismiss.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import {
  BrainIcon,
  AlertTriangleIcon,
  StarIcon,
  TrophyIcon,
  CloseIcon,
} from '@/components/ui/icons'

type ToastType = 'recommendation' | 'warning' | 'success' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
  champion?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  showRecommendation: (champion: string, reason: string) => void
  showPriorityBan: (champion: string, reason: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showRecommendation = useCallback((champion: string, reason: string) => {
    addToast({
      type: 'recommendation',
      title: `AI Recommends: ${champion}`,
      message: reason,
      champion,
      duration: 5000,
    })
  }, [addToast])

  const showPriorityBan = useCallback((champion: string, reason: string) => {
    addToast({
      type: 'warning',
      title: `Priority Ban: ${champion}`,
      message: reason,
      champion,
      duration: 5000,
    })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showRecommendation, showPriorityBan }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 left-56 z-[9999] flex flex-col gap-3 max-w-md pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(onDismiss, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, onDismiss])

  const getStyles = () => {
    switch (toast.type) {
      case 'recommendation':
        return {
          bg: 'bg-gradient-to-r from-cyan-900/95 to-blue-900/95',
          border: 'border-cyan-500/50',
          iconBg: 'bg-cyan-500/20',
          icon: <BrainIcon className="w-5 h-5 text-cyan-400" />,
        }
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-red-900/95 to-orange-900/95',
          border: 'border-red-500/50',
          iconBg: 'bg-red-500/20',
          icon: <AlertTriangleIcon className="w-5 h-5 text-red-400" />,
        }
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-900/95 to-emerald-900/95',
          border: 'border-green-500/50',
          iconBg: 'bg-green-500/20',
          icon: <TrophyIcon className="w-5 h-5 text-green-400" />,
        }
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-800/95 to-gray-900/95',
          border: 'border-gray-600/50',
          iconBg: 'bg-gray-500/20',
          icon: <StarIcon className="w-5 h-5 text-gray-400" />,
        }
    }
  }

  const styles = getStyles()

  return (
    <div
      className={`
        ${styles.bg} ${styles.border}
        border-2 rounded-xl shadow-2xl backdrop-blur-md
        animate-slide-in-left
        flex items-start gap-3 p-4 pr-12 relative
        min-w-[320px]
        ring-1 ring-white/10
      `}
    >
      <div className={`${styles.iconBg} p-2 rounded-lg flex-shrink-0`}>
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white mb-0.5">{toast.title}</div>
        <div className="text-xs text-gray-300 leading-relaxed">{toast.message}</div>
      </div>
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors rounded hover:bg-white/10"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
