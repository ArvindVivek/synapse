'use client'

/**
 * Win Rate Hook - Fetches live win-rate projection from API
 *
 * Fetches win-rate projection for the current draft state and returns
 * user-perspective data with breakdown for tooltip display.
 *
 * Features:
 * - Refetches on turn change
 * - Returns 50-50 at draft start
 * - User-side perspective (userWinRate vs opponentWinRate)
 * - Breakdown for tooltip display
 * - Confidence level indicator
 */

import { useState, useEffect } from 'react'
import { useDraftStore } from '@/lib/draft/store'

/**
 * Breakdown of win-rate projection by category
 * All values are deltas from 0.50 baseline
 */
export interface WinRateBreakdown {
  baseComposition: number
  synergies: number
  matchups: number
  sideAdvantage: number
}

/**
 * Full win-rate projection from API
 */
export interface WinRateProjection {
  blueWinRate: number
  redWinRate: number
  breakdown: WinRateBreakdown
  confidence: 'low' | 'medium' | 'high'
  turnNumber: number
}

/**
 * API response structure
 */
interface WinRateResponse {
  projection: WinRateProjection
  meta: { responseTime: number }
}

/**
 * Hook return type
 */
export interface UseWinRateResult {
  /** Win rate from user's perspective (0-1) */
  userWinRate: number
  /** Opponent's win rate (1 - userWinRate) */
  opponentWinRate: number
  /** Breakdown by category for tooltip */
  breakdown: WinRateBreakdown | null
  /** Confidence level based on picks made */
  confidence: 'low' | 'medium' | 'high'
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
}

/**
 * Initial breakdown at draft start (50-50 with blue side advantage)
 */
const INITIAL_BREAKDOWN: WinRateBreakdown = {
  baseComposition: 0,
  synergies: 0,
  matchups: 0,
  sideAdvantage: 0.02, // Blue side starts with +2% advantage
}

/**
 * Hook for fetching win-rate projection
 *
 * Automatically refetches when turn changes.
 * Returns user-perspective win rate.
 *
 * @returns Win rate data, loading, and error states
 *
 * @example
 * ```tsx
 * function WinRateDisplay() {
 *   const { userWinRate, breakdown, confidence, loading } = useWinRate()
 *
 *   if (loading) return <Spinner />
 *
 *   return (
 *     <div>
 *       <span>{Math.round(userWinRate * 100)}%</span>
 *       <span>Confidence: {confidence}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function useWinRate(): UseWinRateResult {
  const draftId = useDraftStore((state) => state.id)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const userSide = useDraftStore((state) => state.userSide)
  const bluePicks = useDraftStore((state) => state.blue.picks)
  const redPicks = useDraftStore((state) => state.red.picks)

  const [data, setData] = useState<WinRateProjection | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Show 50-50 at start (no picks yet)
    if (!draftId || currentTurn === 0) {
      setData({
        blueWinRate: 0.50,
        redWinRate: 0.50,
        breakdown: INITIAL_BREAKDOWN,
        confidence: 'low',
        turnNumber: 0,
      })
      return
    }

    // If no picks yet, return with blue side advantage
    if (bluePicks.length === 0 && redPicks.length === 0) {
      setData({
        blueWinRate: 0.52,
        redWinRate: 0.48,
        breakdown: INITIAL_BREAKDOWN,
        confidence: 'low',
        turnNumber: currentTurn,
      })
      return
    }

    // Fetch win rate from API, passing picks as query params
    const fetchWinRate = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          userSide,
          bluePicks: bluePicks.map(p => p.champion).join(','),
          redPicks: redPicks.map(p => p.champion).join(','),
        })

        const res = await fetch(`/api/draft/${draftId}/winrate?${params}`)
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }

        const json: WinRateResponse = await res.json()
        setData(json.projection)
      } catch (e) {
        console.error('[useWinRate] Error fetching win rate:', e)
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchWinRate()
  }, [draftId, currentTurn, userSide, bluePicks, redPicks])

  // Calculate user-perspective win rate
  const userWinRate = data
    ? (userSide === 'blue' ? data.blueWinRate : data.redWinRate)
    : 0.50

  // Adjust breakdown for user's side
  // If user is red, flip the sign of side advantage for display
  const adjustedBreakdown = data?.breakdown
    ? {
        ...data.breakdown,
        sideAdvantage: userSide === 'blue'
          ? data.breakdown.sideAdvantage
          : -data.breakdown.sideAdvantage,
      }
    : null

  return {
    userWinRate,
    opponentWinRate: 1 - userWinRate,
    breakdown: adjustedBreakdown,
    confidence: data?.confidence || 'low',
    loading,
    error,
  }
}
