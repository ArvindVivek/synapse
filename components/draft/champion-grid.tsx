'use client'

import { useMemo } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { ALL_CHAMPIONS, championPlaysRole } from '@/lib/draft/champion-data'
import { getTurnInfo } from '@/lib/draft/sequence'
import ChampionCard from './champion-card'

interface ChampionGridProps {
  searchQuery: string
  roleFilter: string | null
  className?: string
}

export function ChampionGrid({ searchQuery, roleFilter, className = '' }: ChampionGridProps) {
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const availableChampions = useDraftStore((state) => state.availableChampions)

  // Determine if we're in ban phase
  const turnInfo = getTurnInfo(currentTurn)
  const isBanPhase = turnInfo?.action === 'ban'

  // Filter and sort champions (memoized)
  const filteredChampions = useMemo(() => {
    return ALL_CHAMPIONS
      .filter((champion) => {
        // Search filter (case-insensitive)
        const matchesSearch = searchQuery === '' ||
          champion.toLowerCase().includes(searchQuery.toLowerCase())

        // Role filter
        const matchesRole = !roleFilter ||
          championPlaysRole(champion, roleFilter as any)

        return matchesSearch && matchesRole
      })
      .sort((a, b) => {
        // Sort: available first, then alphabetically
        const aAvailable = availableChampions.has(a)
        const bAvailable = availableChampions.has(b)
        if (aAvailable !== bAvailable) return bAvailable ? 1 : -1
        return a.localeCompare(b)
      })
  }, [searchQuery, roleFilter, availableChampions])

  return (
    <div className={`flex flex-col bg-gray-800/50 rounded-lg overflow-hidden ${className}`}>
      {/* Champion grid - 6 columns, scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-6 gap-2 justify-items-center">
          {filteredChampions.map((champion) => (
            <ChampionCard
              key={champion}
              champion={champion}
              isBanPhase={isBanPhase}
            />
          ))}
        </div>
      </div>

      {/* Result count - subtle footer */}
      <div className="text-xs text-gray-500 px-3 py-1 bg-gray-900/50 text-center">
        {filteredChampions.length} champions
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
    </div>
  )
}
