'use client'

/**
 * Player selector component for choosing opponent players by role
 *
 * Provides 5 role-based dropdowns for selecting opponent players
 * in each lane position (Top, Jungle, Mid, ADC, Support).
 *
 * @example
 * <PlayerSelector
 *   selectedPlayers={selectedPlayers}
 *   onPlayerSelect={(role, player) => setSelectedPlayers({...})}
 * />
 */

import { useDraftStore } from '@/lib/draft/store'

export const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const
export type Role = (typeof ROLES)[number]

/**
 * Player info structure
 */
export interface PlayerInfo {
  id: string
  name: string
  team: string
}

/**
 * Selected players state structure - one player per role (or null)
 */
export interface SelectedPlayers {
  top: PlayerInfo | null
  jungle: PlayerInfo | null
  mid: PlayerInfo | null
  adc: PlayerInfo | null
  support: PlayerInfo | null
}

/**
 * Mock player data for demo purposes
 * In production, this would come from an API call
 *
 * These are example LCK pro players used for demonstration
 */
const MOCK_PLAYERS: Record<Role, PlayerInfo[]> = {
  top: [
    { id: 'zeus', name: 'Zeus', team: 'T1' },
    { id: 'kiin', name: 'Kiin', team: 'DK' },
    { id: 'doran', name: 'Doran', team: 'GEN' },
    { id: 'perfect', name: 'Perfect', team: 'HLE' },
    { id: 'morgan', name: 'Morgan', team: 'KT' },
  ],
  jungle: [
    { id: 'oner', name: 'Oner', team: 'T1' },
    { id: 'canyon', name: 'Canyon', team: 'GEN' },
    { id: 'peanut', name: 'Peanut', team: 'DK' },
    { id: 'lucid', name: 'Lucid', team: 'KT' },
    { id: 'sponge', name: 'Sponge', team: 'HLE' },
  ],
  mid: [
    { id: 'faker', name: 'Faker', team: 'T1' },
    { id: 'chovy', name: 'Chovy', team: 'GEN' },
    { id: 'showmaker', name: 'ShowMaker', team: 'DK' },
    { id: 'zeka', name: 'Zeka', team: 'HLE' },
    { id: 'bdd', name: 'BDD', team: 'KT' },
  ],
  adc: [
    { id: 'gumayusi', name: 'Gumayusi', team: 'T1' },
    { id: 'peyz', name: 'Peyz', team: 'GEN' },
    { id: 'aiming', name: 'Aiming', team: 'DK' },
    { id: 'viper', name: 'Viper', team: 'HLE' },
    { id: 'deft', name: 'Deft', team: 'KT' },
  ],
  support: [
    { id: 'keria', name: 'Keria', team: 'T1' },
    { id: 'lehends', name: 'Lehends', team: 'GEN' },
    { id: 'kellin', name: 'Kellin', team: 'DK' },
    { id: 'delight', name: 'Delight', team: 'HLE' },
    { id: 'beryl', name: 'BeryL', team: 'KT' },
  ],
}

/**
 * Role-specific colors for visual distinction
 */
const ROLE_COLORS: Record<Role, string> = {
  top: 'bg-yellow-600',
  jungle: 'bg-green-600',
  mid: 'bg-blue-600',
  adc: 'bg-red-600',
  support: 'bg-cyan-600',
}

interface PlayerSelectorProps {
  selectedPlayers: SelectedPlayers
  onPlayerSelect: (role: Role, player: PlayerInfo | null) => void
}

/**
 * Player selector component with role-based dropdowns
 *
 * Features:
 * - 5 role-based dropdowns (Top, Jungle, Mid, ADC, Support)
 * - Role-colored labels for visual distinction
 * - Clear button to deselect individual players
 * - Shows opponent team label based on user's side
 */
export function PlayerSelector({
  selectedPlayers,
  onPlayerSelect,
}: PlayerSelectorProps) {
  const userSide = useDraftStore((state) => state.userSide)
  const opponentSide = userSide === 'blue' ? 'RED' : 'BLUE'

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-2">
        {opponentSide} TEAM PLAYERS
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Select opponent players to see their champion pools
      </p>

      <div className="space-y-3">
        {ROLES.map((role) => (
          <div key={role} className="flex items-center gap-3">
            {/* Role label with color coding */}
            <div
              className={`w-16 text-xs font-bold uppercase text-center py-1.5 rounded text-white ${ROLE_COLORS[role]}`}
            >
              {role}
            </div>

            {/* Player dropdown */}
            <select
              value={selectedPlayers[role]?.id || ''}
              onChange={(e) => {
                const player = MOCK_PLAYERS[role].find(
                  (p) => p.id === e.target.value
                )
                onPlayerSelect(role, player || null)
              }}
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded
                         border border-gray-600 focus:outline-none focus:ring-2
                         focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Select {role} player...</option>
              {MOCK_PLAYERS[role].map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>

            {/* Clear button - only shown when player is selected */}
            {selectedPlayers[role] && (
              <button
                onClick={() => onPlayerSelect(role, null)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label={`Clear ${role} selection`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Selected count indicator */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          {
            Object.values(selectedPlayers).filter((p) => p !== null).length
          }{' '}
          of 5 players selected
        </p>
      </div>
    </div>
  )
}

/**
 * Create empty selected players state
 */
export function createEmptySelectedPlayers(): SelectedPlayers {
  return {
    top: null,
    jungle: null,
    mid: null,
    adc: null,
    support: null,
  }
}
