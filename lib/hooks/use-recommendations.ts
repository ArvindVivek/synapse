'use client'

/**
 * Hook for fetching pick/ban recommendations.
 *
 * Fetches recommendations during ALL phases (ban and pick).
 * Sends current state to ensure recommendations are always up-to-date.
 * Automatically refetches when turn changes.
 */

import { useState, useEffect, useCallback } from 'react'
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
 * Hook for fetching pick/ban recommendations
 *
 * @returns Object containing recommendations data, loading state, and error
 */
export function useRecommendations() {
  const draftId = useDraftStore((state) => state.id)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const phase = useDraftStore((state) => state.phase)
  const userSide = useDraftStore((state) => state.userSide)
  const blue = useDraftStore((state) => state.blue)
  const red = useDraftStore((state) => state.red)
  const opponentTeam = useDraftStore((state) => state.opponentTeam)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())

  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!draftId || currentTurn === 0) {
      setData(null)
      return
    }

    // Only fetch when it's user's turn
    if (!isMyTurn) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Send current state to API via POST for accurate recommendations
      const res = await fetch(`/api/draft/${draftId}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTurn,
          phase,
          userSide,
          blue: {
            bans: blue.bans,
            picks: blue.picks.map(p => p.champion),
          },
          red: {
            bans: red.bans,
            picks: red.picks.map(p => p.champion),
          },
          opponentTeam: opponentTeam || null,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [draftId, currentTurn, phase, userSide, blue, red, opponentTeam, isMyTurn])

  // Fetch when turn changes or when it becomes user's turn
  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return { data, loading, error, refetch: fetchRecommendations }
}
