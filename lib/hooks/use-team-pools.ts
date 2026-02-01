'use client'

/**
 * Hook for fetching champion pools for all players on a team
 *
 * Fetches all player pools in parallel for efficient loading.
 * Used by opponent sidebar to show all players' champion data at once.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ChampionPoolEntry, PlayerPoolData } from './use-player-pool'

export interface TeamPlayerPool {
  playerId: string
  playerName: string
  role: string
  championPool: ChampionPoolEntry[]
  topChampions: ChampionPoolEntry[] // Top 3 for quick display
  signatureChamps: ChampionPoolEntry[] // Signature picks
  avgWinRate: number
  totalGames: number
}

export interface UseTeamPoolsResult {
  pools: Map<string, TeamPlayerPool> // playerId -> pool data
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface PlayerInput {
  id: string
  name: string
  role: string
}

/**
 * Fetch champion pools for all players on a team
 *
 * @param players - Array of player objects with id, name, role
 * @returns { pools, loading, error, refetch }
 */
export function useTeamPools(players: PlayerInput[]): UseTeamPoolsResult {
  const [pools, setPools] = useState<Map<string, TeamPlayerPool>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  // Create a stable key from player IDs to prevent unnecessary refetches
  const playersKey = useMemo(
    () => players.map((p) => p.id).sort().join(','),
    [players]
  )

  // Use ref to access current players in async callback without triggering re-runs
  const playersRef = useRef(players)
  playersRef.current = players

  const refetch = useCallback(() => {
    setFetchTrigger((t) => t + 1)
  }, [])

  useEffect(() => {
    // Clear state if no players
    if (!playersKey) {
      setPools(new Map())
      setError(null)
      setLoading(false)
      return
    }

    const currentPlayers = playersRef.current

    // Abort controller for cleanup
    const abortController = new AbortController()

    const fetchAllPools = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch all player pools in parallel
        const fetchPromises = currentPlayers.map(async (player) => {
          try {
            const res = await fetch(`/api/analytics/players/${player.id}`, {
              signal: abortController.signal,
            })

            if (!res.ok) {
              // Return empty pool on error for this player
              return {
                playerId: player.id,
                playerName: player.name,
                role: player.role,
                championPool: [],
                topChampions: [],
                signatureChamps: [],
                avgWinRate: 0,
                totalGames: 0,
              } as TeamPlayerPool
            }

            const json: PlayerPoolData = await res.json()
            const championPool = json.championPool || []

            // Calculate derived data
            const signatureChamps = championPool.filter(
              (c) => c.comfortLevel === 'signature'
            )
            const topChampions = championPool
              .sort((a, b) => b.winRate - a.winRate)
              .slice(0, 3)
            const avgWinRate =
              championPool.length > 0
                ? championPool.reduce((sum, c) => sum + c.winRate, 0) /
                  championPool.length
                : 0
            const totalGames = championPool.reduce(
              (sum, c) => sum + c.gamesPlayed,
              0
            )

            return {
              playerId: player.id,
              playerName: player.name,
              role: player.role,
              championPool,
              topChampions,
              signatureChamps,
              avgWinRate,
              totalGames,
            } as TeamPlayerPool
          } catch (e) {
            // Ignore abort errors, return empty for other errors
            if ((e as Error).name === 'AbortError') throw e
            return {
              playerId: player.id,
              playerName: player.name,
              role: player.role,
              championPool: [],
              topChampions: [],
              signatureChamps: [],
              avgWinRate: 0,
              totalGames: 0,
            } as TeamPlayerPool
          }
        })

        const results = await Promise.all(fetchPromises)

        // Build map from results
        const poolMap = new Map<string, TeamPlayerPool>()
        for (const pool of results) {
          poolMap.set(pool.playerId, pool)
        }

        setPools(poolMap)
      } catch (e) {
        // Ignore abort errors
        if ((e as Error).name === 'AbortError') return
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllPools()

    // Cleanup: abort fetch if players change or component unmounts
    return () => {
      abortController.abort()
    }
  }, [playersKey, fetchTrigger])

  return { pools, loading, error, refetch }
}
