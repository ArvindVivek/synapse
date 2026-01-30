'use client'

/**
 * Hook for fetching pick recommendations from the API.
 *
 * Fetches recommendations during pick phases, returns null during ban phases.
 * Automatically refetches when turn changes.
 */

import { useState, useEffect } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import type { PickRecommendation, ScoringWeights } from '@/lib/recommendations/types'

/**
 * Response from /api/draft/:id/recommendations
 */
export interface RecommendationsResponse {
  recommendations: PickRecommendation[]
  meta: {
    responseTime: number
    turnNumber: number
    weights: ScoringWeights
    candidatesScored: number
  }
}

/**
 * Hook for fetching pick recommendations
 *
 * @returns Object containing recommendations data, loading state, and error
 */
export function useRecommendations() {
  const draftId = useDraftStore((state) => state.id)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const phase = useDraftStore((state) => state.phase)

  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Only fetch during pick phases
    if (!draftId || currentTurn === 0 || phase === 'ban1' || phase === 'ban2') {
      setData(null)
      return
    }

    const fetchRecommendations = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/draft/${draftId}/recommendations`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        setData(json)
      } catch (e) {
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [draftId, currentTurn, phase])

  return { data, loading, error }
}
