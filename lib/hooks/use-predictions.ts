'use client'

/**
 * Hooks for fetching opponent pick predictions
 *
 * Provides both single-player and multi-player prediction hooks
 * that fetch from the predictions API and re-fetch on turn changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDraftStore } from '@/lib/draft/store'

/**
 * Single champion prediction from the API
 */
export interface ChampionPrediction {
  champion: string
  probability: number
  reasoning: string
  comfortLevel: 'signature' | 'comfort' | 'occasional' | 'rare'
  gamesPlayed: number
  winRate: number
}

/**
 * Prediction data for a single player
 */
export interface PlayerPrediction {
  playerId: string
  playerName: string
  role: string
  predictions: ChampionPrediction[]
}

/**
 * API response shape
 */
interface PredictionsResponse {
  predictions: ChampionPrediction[]
  player: { id: string; name: string; role: string }
  meta: { responseTime: number }
}

/**
 * Hook to fetch predictions for a single player
 *
 * @param playerId - Player ID to predict for (null to disable)
 * @param playerName - Player display name
 * @param role - Player's role (top, jungle, mid, adc, support)
 *
 * @returns { data, loading, error, refetch }
 *
 * @example
 * const { data, loading, error } = usePredictions('faker-id', 'Faker', 'mid')
 */
export function usePredictions(
  playerId: string | null,
  playerName: string | null,
  role: string
) {
  const draftId = useDraftStore((state) => state.id)
  const currentTurn = useDraftStore((state) => state.currentTurn)

  const [data, setData] = useState<PlayerPrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track last fetch params to avoid duplicate requests
  const lastFetchRef = useRef<string | null>(null)

  const fetchPredictions = useCallback(async () => {
    if (!draftId || !playerId || currentTurn === 0) {
      setData(null)
      return
    }

    // Build unique key for this fetch
    const fetchKey = `${draftId}-${playerId}-${role}-${currentTurn}`
    if (lastFetchRef.current === fetchKey) {
      return // Already fetched this exact configuration
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        playerId,
        playerName: playerName || 'Unknown',
        role,
      })

      const res = await fetch(`/api/draft/${draftId}/predictions?${params}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const json: PredictionsResponse = await res.json()

      setData({
        playerId: json.player.id,
        playerName: json.player.name,
        role: json.player.role,
        predictions: json.predictions,
      })

      lastFetchRef.current = fetchKey
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [draftId, playerId, playerName, role, currentTurn])

  useEffect(() => {
    fetchPredictions()
  }, [fetchPredictions])

  return {
    data,
    loading,
    error,
    refetch: fetchPredictions
  }
}

/**
 * Hook to fetch predictions for multiple players in parallel
 *
 * Optimized for fetching predictions for an entire opponent team.
 * Filters out null players and fetches all valid players in parallel.
 *
 * @param players - Array of player objects (or null for empty slots)
 *
 * @returns { data, loading, error, refetch }
 *
 * @example
 * const { data } = useMultiPlayerPredictions([
 *   { id: 'zeus-id', name: 'Zeus', role: 'top' },
 *   { id: 'oner-id', name: 'Oner', role: 'jungle' },
 *   null, // empty slot
 *   null, // empty slot
 *   null, // empty slot
 * ])
 */
export function useMultiPlayerPredictions(
  players: Array<{ id: string; name: string; role: string } | null>
) {
  const draftId = useDraftStore((state) => state.id)
  const currentTurn = useDraftStore((state) => state.currentTurn)

  const [data, setData] = useState<PlayerPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Stable serialization of players for dependency tracking
  const playersKey = JSON.stringify(
    players.filter((p): p is { id: string; name: string; role: string } => p !== null)
  )

  const fetchAllPredictions = useCallback(async () => {
    const validPlayers = players.filter(
      (p): p is { id: string; name: string; role: string } => p !== null
    )

    if (!draftId || validPlayers.length === 0 || currentTurn === 0) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all predictions in parallel
      const results = await Promise.all(
        validPlayers.map(async (player) => {
          try {
            const params = new URLSearchParams({
              playerId: player.id,
              playerName: player.name,
              role: player.role,
            })

            const res = await fetch(`/api/draft/${draftId}/predictions?${params}`)
            if (!res.ok) return null

            const json: PredictionsResponse = await res.json()
            return {
              playerId: json.player.id,
              playerName: json.player.name,
              role: json.player.role,
              predictions: json.predictions,
            }
          } catch {
            // Individual player fetch failed, skip this player
            return null
          }
        })
      )

      setData(results.filter((r): r is PlayerPrediction => r !== null))
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [draftId, currentTurn, playersKey])

  useEffect(() => {
    fetchAllPredictions()
  }, [fetchAllPredictions])

  return {
    data,
    loading,
    error,
    refetch: fetchAllPredictions
  }
}
