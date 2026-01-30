'use client'

/**
 * Enhanced opponent analysis sidebar
 *
 * Shows detailed player stats, champion pools with win rates,
 * and pick predictions with probability bars.
 */

import { useState } from 'react'
import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { usePlayerPool } from '@/lib/hooks/use-player-pool'
import { getChampionImageUrl } from '@/lib/draft/champion-data'
import {
  type Role,
  type PlayerInfo,
  type SelectedPlayers,
  ROLES,
  createEmptySelectedPlayers,
} from './player-selector'
import {
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
  UsersIcon,
  CloseIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@/components/ui/icons'

// Player roster with teams
const PLAYER_ROSTER: Record<Role, PlayerInfo[]> = {
  top: [
    { id: 'Zeus', name: 'Zeus', team: 'T1' },
    { id: 'Kiin', name: 'Kiin', team: 'DK' },
    { id: 'Doran', name: 'Doran', team: 'GEN' },
  ],
  jungle: [
    { id: 'Oner', name: 'Oner', team: 'T1' },
    { id: 'Canyon', name: 'Canyon', team: 'GEN' },
    { id: 'Peanut', name: 'Peanut', team: 'DK' },
  ],
  mid: [
    { id: 'Faker', name: 'Faker', team: 'T1' },
    { id: 'Chovy', name: 'Chovy', team: 'GEN' },
    { id: 'ShowMaker', name: 'ShowMaker', team: 'DK' },
  ],
  adc: [
    { id: 'Gumayusi', name: 'Gumayusi', team: 'T1' },
    { id: 'Peyz', name: 'Peyz', team: 'GEN' },
    { id: 'Aiming', name: 'Aiming', team: 'DK' },
  ],
  support: [
    { id: 'Keria', name: 'Keria', team: 'T1' },
    { id: 'Lehends', name: 'Lehends', team: 'GEN' },
    { id: 'Kellin', name: 'Kellin', team: 'DK' },
  ],
}

const ROLE_ICONS = {
  top: TopIcon,
  jungle: JungleIcon,
  mid: MidIcon,
  adc: AdcIcon,
  support: SupportIcon,
}

const ROLE_LABELS: Record<Role, string> = {
  top: 'TOP',
  jungle: 'JGL',
  mid: 'MID',
  adc: 'ADC',
  support: 'SUP',
}

interface OpponentSidebarProps {
  className?: string
}

export function OpponentSidebar({ className = '' }: OpponentSidebarProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayers>(
    createEmptySelectedPlayers()
  )
  const [expandedRole, setExpandedRole] = useState<Role | null>(null)

  const userSide = useDraftStore((state) => state.userSide)
  const opponentSide = userSide === 'blue' ? 'RED' : 'BLUE'

  // Get pool for expanded player
  const expandedPlayer = expandedRole ? selectedPlayers[expandedRole] : null
  const { data: poolData, loading: isLoading } = usePlayerPool(expandedPlayer?.id || null)
  const pool = poolData?.championPool || []

  const handlePlayerSelect = (role: Role, player: PlayerInfo | null) => {
    setSelectedPlayers((prev) => ({ ...prev, [role]: player }))
    if (player) {
      setExpandedRole(role)
    }
  }

  const selectedCount = Object.values(selectedPlayers).filter((p) => p !== null).length

  // Calculate pool stats
  const signatureCount = pool.filter(c => c.comfortLevel === 'signature').length
  const comfortCount = pool.filter(c => c.comfortLevel === 'comfort').length
  const avgWinRate = pool.length > 0
    ? pool.reduce((sum, c) => sum + c.winRate, 0) / pool.length
    : 0
  const totalGames = pool.reduce((sum, c) => sum + c.gamesPlayed, 0)

  return (
    <div className={`flex flex-col bg-gray-900/90 border-r border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            {opponentSide} TEAM ANALYSIS
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded ${
            selectedCount === 5 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
          }`}>
            {selectedCount}/5
          </span>
        </div>
      </div>

      {/* Player selectors */}
      <div className="flex-shrink-0 p-2 space-y-1 border-b border-gray-800">
        {ROLES.map((role) => {
          const player = selectedPlayers[role]
          const isExpanded = expandedRole === role
          const RoleIcon = ROLE_ICONS[role]

          return (
            <div
              key={role}
              className={`flex items-center gap-2 p-1.5 rounded transition-colors ${
                isExpanded ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-gray-800/50'
              }`}
            >
              {/* Role icon */}
              <div className="w-6 flex items-center justify-center">
                <RoleIcon className="w-4 h-4 text-gray-400" />
              </div>

              {/* Player select */}
              <select
                value={player?.id || ''}
                onChange={(e) => {
                  const p = PLAYER_ROSTER[role].find((x) => x.id === e.target.value)
                  handlePlayerSelect(role, p || null)
                }}
                className="flex-1 px-2 py-1 bg-gray-800 text-white text-xs rounded
                           border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select {ROLE_LABELS[role]}...</option>
                {PLAYER_ROSTER[role].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.team})
                  </option>
                ))}
              </select>

              {/* Quick view button */}
              {player && (
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role)}
                  className={`p-1 rounded transition-colors ${
                    isExpanded
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-3 h-3" />
                  ) : (
                    <ChevronRightIcon className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Expanded player details */}
      {expandedPlayer && (
        <div className="flex-1 overflow-y-auto">
          {/* Player header with stats */}
          <div className="px-3 py-2 bg-gray-800/30 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold text-white">{expandedPlayer.name}</span>
                <span className="text-xs text-gray-500 ml-2">{expandedPlayer.team}</span>
              </div>
              <button
                onClick={() => setExpandedRole(null)}
                className="text-gray-500 hover:text-white"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats row */}
            {!isLoading && pool.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800 rounded p-1.5">
                  <div className="text-yellow-400 font-bold text-sm">{signatureCount}</div>
                  <div className="text-[10px] text-gray-500">Signature</div>
                </div>
                <div className="bg-gray-800 rounded p-1.5">
                  <div className="text-blue-400 font-bold text-sm">{Math.round(avgWinRate * 100)}%</div>
                  <div className="text-[10px] text-gray-500">Avg WR</div>
                </div>
                <div className="bg-gray-800 rounded p-1.5">
                  <div className="text-gray-300 font-bold text-sm">{totalGames}</div>
                  <div className="text-[10px] text-gray-500">Games</div>
                </div>
              </div>
            )}
          </div>

          {/* Champion pool list */}
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-400 mb-2 px-1">
              CHAMPION POOL
            </div>

            {isLoading ? (
              <div className="text-xs text-gray-500 text-center py-4">Loading stats...</div>
            ) : pool.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">No data available</div>
            ) : (
              <div className="space-y-1.5">
                {pool.slice(0, 10).map((champ, idx) => (
                  <ChampionPoolRow key={champ.champion} champ={champ} rank={idx + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!expandedPlayer && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <UsersIcon className="w-8 h-8 text-gray-600 mb-2" />
          <p className="text-xs text-gray-500">
            Select opponent players to analyze their champion pools and predict picks
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Individual champion row with detailed stats
 */
function ChampionPoolRow({
  champ,
  rank
}: {
  champ: {
    champion: string
    gamesPlayed: number
    winRate: number
    comfortLevel: string
    roles: string[]
  }
  rank: number
}) {
  const wrPercent = Math.round(champ.winRate * 100)
  const wrColor = wrPercent >= 60 ? 'text-green-400' : wrPercent >= 50 ? 'text-blue-400' : 'text-red-400'
  const wrBarColor = wrPercent >= 60 ? 'bg-green-500' : wrPercent >= 50 ? 'bg-blue-500' : 'bg-red-500'

  const comfortBadge = champ.comfortLevel === 'signature'
    ? { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '★' }
    : champ.comfortLevel === 'comfort'
    ? { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '●' }
    : { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '○' }

  return (
    <div className="flex items-center gap-2 p-1.5 bg-gray-800/50 rounded hover:bg-gray-800 transition-colors">
      {/* Rank */}
      <div className="w-4 text-[10px] text-gray-500 text-center">
        #{rank}
      </div>

      {/* Champion icon */}
      <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
        <Image
          src={getChampionImageUrl(champ.champion)}
          alt={champ.champion}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Champion info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white truncate">{champ.champion}</span>
          <span className={`text-[10px] px-1 rounded ${comfortBadge.bg} ${comfortBadge.text}`}>
            {comfortBadge.label}
          </span>
        </div>

        {/* Win rate bar */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${wrBarColor} transition-all`}
              style={{ width: `${wrPercent}%` }}
            />
          </div>
          <span className={`text-[10px] font-medium ${wrColor} w-8 text-right`}>
            {wrPercent}%
          </span>
        </div>
      </div>

      {/* Games count */}
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-gray-300">{champ.gamesPlayed}</div>
        <div className="text-[10px] text-gray-500">games</div>
      </div>
    </div>
  )
}
