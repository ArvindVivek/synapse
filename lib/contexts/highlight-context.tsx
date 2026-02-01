'use client'

/**
 * Highlight Context
 *
 * Manages which champions should be highlighted in the main grid.
 * Used to visually connect AI recommendations and priority bans to the grid.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type HighlightType = 'recommendation' | 'priority-ban' | 'synergy' | 'counter'

interface HighlightedChampion {
  champion: string
  type: HighlightType
  score?: number // 0-1 for intensity
}

interface HighlightContextValue {
  highlights: HighlightedChampion[]
  setHighlights: (highlights: HighlightedChampion[]) => void
  addHighlight: (highlight: HighlightedChampion) => void
  removeHighlight: (champion: string) => void
  clearHighlights: () => void
  getHighlight: (champion: string) => HighlightedChampion | undefined
  isHighlighted: (champion: string) => boolean
  getHighlightType: (champion: string) => HighlightType | undefined
}

const HighlightContext = createContext<HighlightContextValue | null>(null)

export function useHighlights() {
  const context = useContext(HighlightContext)
  if (!context) {
    throw new Error('useHighlights must be used within a HighlightProvider')
  }
  return context
}

export function HighlightProvider({ children }: { children: ReactNode }) {
  const [highlights, setHighlightsState] = useState<HighlightedChampion[]>([])

  const setHighlights = useCallback((newHighlights: HighlightedChampion[]) => {
    setHighlightsState(newHighlights)
  }, [])

  const addHighlight = useCallback((highlight: HighlightedChampion) => {
    setHighlightsState((prev) => {
      // Remove existing highlight for same champion if exists
      const filtered = prev.filter((h) => h.champion !== highlight.champion)
      return [...filtered, highlight]
    })
  }, [])

  const removeHighlight = useCallback((champion: string) => {
    setHighlightsState((prev) => prev.filter((h) => h.champion !== champion))
  }, [])

  const clearHighlights = useCallback(() => {
    setHighlightsState([])
  }, [])

  const getHighlight = useCallback(
    (champion: string) => highlights.find((h) => h.champion === champion),
    [highlights]
  )

  const isHighlighted = useCallback(
    (champion: string) => highlights.some((h) => h.champion === champion),
    [highlights]
  )

  const getHighlightType = useCallback(
    (champion: string) => highlights.find((h) => h.champion === champion)?.type,
    [highlights]
  )

  return (
    <HighlightContext.Provider
      value={{
        highlights,
        setHighlights,
        addHighlight,
        removeHighlight,
        clearHighlights,
        getHighlight,
        isHighlighted,
        getHighlightType,
      }}
    >
      {children}
    </HighlightContext.Provider>
  )
}
