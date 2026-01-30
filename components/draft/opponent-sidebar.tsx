'use client'

/**
 * Compact opponent analysis sidebar
 *
 * Contains:
 * - Player selector (5 roles)
 * - Selected player's champion pool
 * - Pick predictions
 */

import { useState } from 'react'
import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { usePlayerPool } from '@/lib/hooks/use-player-pool'
import {
  type Role,
  type PlayerInfo,
  type SelectedPlayers,
  ROLES,
  createEmptySelectedPlayers,
} from './player-selector'

// Player roster (same as player-selector but inline for simplicity)
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

const ROLE_COLORS: Record<Role, string> = {
  top: 'bg-yellow-600',
  jungle: 'bg-green-600',
  mid: 'bg-blue-600',
  adc: 'bg-red-600',
  support: 'bg-cyan-600',
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

  return (
    <div className={`flex flex-col bg-gray-900/80 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800">
        <h3 className="text-sm font-bold text-white">{opponentSide} TEAM</h3>
        <p className="text-xs text-gray-500">{selectedCount}/5 selected</p>
      </div>

      {/* Player selectors */}
      <div className="flex-shrink-0 p-2 space-y-1.5">
        {ROLES.map((role) => (
          <div key={role} className="flex items-center gap-2">
            {/* Role badge */}
            <div
              className={`w-8 text-[10px] font-bold uppercase text-center py-1 rounded text-white ${ROLE_COLORS[role]}`}
            >
              {role.slice(0, 3)}
            </div>

            {/* Player select */}
            <select
              value={selectedPlayers[role]?.id || ''}
              onChange={(e) => {
                const player = PLAYER_ROSTER[role].find((p) => p.id === e.target.value)
                handlePlayerSelect(role, player || null)
              }}
              className="flex-1 px-2 py-1 bg-gray-800 text-white text-xs rounded
                         border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {PLAYER_ROSTER[role].map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Champion pool for selected player */}
      {expandedPlayer && (
        <div className="flex-1 overflow-y-auto border-t border-gray-800">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">
                {expandedPlayer.name}'s Pool
              </span>
              <button
                onClick={() => setExpandedRole(null)}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {isLoading ? (
              <div className="text-xs text-gray-500">Loading...</div>
            ) : pool.length === 0 ? (
              <div className="text-xs text-gray-500">No data available</div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {pool.slice(0, 8).map((champ) => (
                  <div
                    key={champ.champion}
                    className="relative group"
                    title={`${champ.champion} - ${champ.gamesPlayed} games, ${Math.round(champ.winRate * 100)}% WR`}
                  >
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champ.champion}.png`}
                      alt={champ.champion}
                      width={36}
                      height={36}
                      className={`rounded ${
                        champ.comfortLevel === 'signature'
                          ? 'ring-2 ring-yellow-400'
                          : champ.comfortLevel === 'comfort'
                          ? 'ring-1 ring-blue-400'
                          : ''
                      }`}
                    />
                    <div className="absolute bottom-0 right-0 bg-black/80 text-[8px] px-0.5 rounded">
                      {champ.gamesPlayed}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when no player expanded */}
      {!expandedPlayer && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-gray-500 text-center">
            Select a player to see their champion pool
          </p>
        </div>
      )}
    </div>
  )
}
