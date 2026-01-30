'use client'

/**
 * Hook for fetching ban recommendations from the API.
 *
 * Fetches recommendations during ban phases, returns null during pick phases.
 * Automatically refetches when turn changes.
 *
 * Note: Currently uses the recommendations endpoint and transforms data.
 * A dedicated /bans endpoint would provide better targeted bans using
 * player pool data (implementation deferred to polish phase if time permits).
 */

import { useState, useEffect } from 'react'
import { useDraftStore } from '@/lib/draft/store'

/**
 * Ban recommendation with category (target vs priority)
 */
export interface BanRecommendation {
  champion: string
  score: number
  reason: string
  targetPlayer?: string
  category: 'target' | 'priority'
}

/**
 * Response from ban recommendations
 */
export interface BansResponse {
  recommendations: BanRecommendation[]
  meta: {
    responseTime: number
    turnNumber: number
  }
}

/**
 * Hook for fetching ban recommendations
 *
 * @returns Object containing ban recommendations data, loading state, and error
 */
export function useBans() {
  const draftId = useDraftStore((state) => state.id)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const phase = useDraftStore((state) => state.phase)

  const [data, setData] = useState<BansResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Only fetch during ban phases
    if (!draftId || currentTurn === 0 || (phase !== 'ban1' && phase !== 'ban2')) {
      setData(null)
      return
    }

    const fetchBans = async () => {
      setLoading(true)
      setError(null)

      try {
        // Using recommendations endpoint for now (ban scoring is in Phase 4)
        // Future: dedicated /api/draft/[id]/bans endpoint
        const res = await fetch(`/api/draft/${draftId}/recommendations`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()

        // Transform recommendations to ban format for MVP
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const banRecs: BanRecommendation[] = json.recommendations
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => ({
            champion: r.champion,
            score: r.totalScore,
            reason: r.reasoning?.[0] || 'High priority ban',
            category: 'priority' as const
          }))

        setData({
          recommendations: banRecs,
          meta: {
            responseTime: json.meta.responseTime,
            turnNumber: json.meta.turnNumber
          }
        })
      } catch (e) {
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchBans()
  }, [draftId, currentTurn, phase])

  return { data, loading, error }
}
