'use client'

import { useState, useMemo } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { ALL_CHAMPIONS, championPlaysRole } from '@/lib/draft/champion-data'
import { getTurnInfo } from '@/lib/draft/sequence'
import ChampionCard from './champion-card'

const ROLES = ['all', 'top', 'jungle', 'mid', 'adc', 'support'] as const
type RoleFilter = typeof ROLES[number]

export function ChampionGrid() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

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
        const matchesRole = roleFilter === 'all' ||
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
    <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg">
      {/* Search input */}
      <input
        type="text"
        placeholder="Search champions..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg
                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Role filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium capitalize
              transition-colors
              ${roleFilter === role
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {role === 'all' ? 'All Roles' : role.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Phase indicator */}
      <div className={`text-sm font-semibold ${isBanPhase ? 'text-red-400' : 'text-green-400'}`}>
        {isBanPhase ? 'BAN PHASE - Click to ban' : 'PICK PHASE - Click to pick'}
      </div>

      {/* Champion grid (CSS Grid, not virtualization) */}
      <div className="grid grid-cols-8 gap-2 max-h-[500px] overflow-y-auto">
        {filteredChampions.map((champion) => (
          <ChampionCard
            key={champion}
            champion={champion}
            isBanPhase={isBanPhase}
          />
        ))}
      </div>

      {/* Result count */}
      <div className="text-sm text-gray-400">
        {filteredChampions.length} champions
        {searchQuery && ` matching "${searchQuery}"`}
        {roleFilter !== 'all' && ` in ${roleFilter.toUpperCase()}`}
      </div>
    </div>
  )
}
