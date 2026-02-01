'use client'

/**
 * Hook for fetching all teams with their players from the API
 */

import { useState, useEffect } from 'react'

export interface TeamPlayer {
  id: string
  name: string
  role: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
}

export interface Team {
  id: string
  name: string
  players: TeamPlayer[]
}

export interface UseTeamsResult {
  teams: Team[]
  loading: boolean
  error: Error | null
}

export function useTeams(): UseTeamsResult {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    const fetchTeams = async () => {
      try {
        const res = await fetch('/api/teams', {
          signal: abortController.signal
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch teams`)
        }

        const json = await res.json()
        setTeams(json.teams || [])
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()

    return () => {
      abortController.abort()
    }
  }, [])

  return { teams, loading, error }
}
