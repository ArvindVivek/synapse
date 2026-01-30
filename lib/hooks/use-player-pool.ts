'use client'

/**
 * Hook for fetching player champion pool data
 *
 * Provides:
 * - data: Player's champion pool with comfort levels
 * - loading: Fetch in progress
 * - error: Fetch error if any
 *
 * @example
 * const { data, loading, error } = usePlayerPool('faker-uuid')
 * if (data) {
 *   console.log(data.championPool) // [{champion: 'Azir', winRate: 0.68, ...}]
 * }
 */

import { useState, useEffect } from 'react'

export interface ChampionPoolEntry {
  champion: string
  gamesPlayed: number
  winRate: number
  comfortLevel: 'signature' | 'comfort' | 'recent' | 'historical'
  roles: string[]
}

export interface PlayerPoolData {
  playerId: string
  playerName: string
  championPool: ChampionPoolEntry[]
  meta: {
    responseTime: number
  }
}

export interface UsePlayerPoolResult {
  data: PlayerPoolData | null
  loading: boolean
  error: Error | null
}

/**
 * Fetch player's champion pool data
 *
 * @param playerId - Player UUID to fetch pool for, or null to skip
 * @returns { data, loading, error }
 */
export function usePlayerPool(playerId: string | null): UsePlayerPoolResult {
  const [data, setData] = useState<PlayerPoolData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Clear state if no playerId
    if (!playerId) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    // Abort controller for cleanup
    const abortController = new AbortController()

    const fetchPool = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/analytics/players/${playerId}`, {
          signal: abortController.signal
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch player pool`)
        }

        const json = await res.json()
        setData(json)
      } catch (e) {
        // Ignore abort errors
        if ((e as Error).name === 'AbortError') return
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchPool()

    // Cleanup: abort fetch if playerId changes or component unmounts
    return () => {
      abortController.abort()
    }
  }, [playerId])

  return { data, loading, error }
}
