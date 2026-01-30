'use client'

/**
 * Phase header component with prominent action indicator
 *
 * Displays "BAN A CHAMPION!" or "PICK A CHAMPION!" prominently,
 * along with turn info, role filters, and search.
 */

import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'

interface PhaseHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  roleFilter: string | null
  onRoleFilterChange: (role: string | null) => void
}

const ROLE_ICONS: Record<string, { icon: string; label: string }> = {
  top: { icon: '⚔️', label: 'Top' },
  jungle: { icon: '🌲', label: 'Jungle' },
  mid: { icon: '🎯', label: 'Mid' },
  adc: { icon: '🏹', label: 'ADC' },
  support: { icon: '🛡️', label: 'Support' },
}

export function PhaseHeader({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: PhaseHeaderProps) {
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const userSide = useDraftStore((state) => state.userSide)
  const isComplete = useDraftStore((state) => state.isComplete)

  const turnInfo = getTurnInfo(currentTurn)
  const isBanPhase = turnInfo?.action === 'ban'
  const currentSide = turnInfo?.side || 'blue'
  const isMyTurn = currentSide === userSide

  // Phase text
  const phaseText = isBanPhase ? 'BAN A CHAMPION!' : 'PICK A CHAMPION!'

  // Side label
  const sideLabel = currentSide === 'blue' ? 'Blue Team' : 'Red Team'

  if (isComplete) {
    return (
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-400">DRAFT COMPLETE</h1>
        </div>
      </header>
    )
  }

  if (currentTurn === 0) {
    return (
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">SELECT YOUR SIDE</h1>
          <p className="text-gray-400 text-sm mt-1">Choose Blue or Red team to begin</p>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-2">
      {/* Main phase indicator */}
      <div className="flex items-center justify-between">
        {/* Left: Role filters */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRoleFilterChange(null)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              roleFilter === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {Object.entries(ROLE_ICONS).map(([role, { icon, label }]) => (
            <button
              key={role}
              onClick={() => onRoleFilterChange(roleFilter === role ? null : role)}
              className={`px-2 py-1.5 rounded text-lg transition-colors ${
                roleFilter === role
                  ? 'bg-blue-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Center: Phase text and turn info */}
        <div className="text-center flex-1 px-4">
          <h1
            className={`text-2xl font-bold tracking-wide ${
              isBanPhase ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {phaseText}
          </h1>
          <p className="text-sm text-gray-400">
            Turn {currentTurn}/20 —{' '}
            <span
              className={`font-semibold ${
                currentSide === 'blue' ? 'text-blue-400' : 'text-red-400'
              }`}
            >
              {sideLabel}
            </span>
            {isMyTurn && (
              <span className="ml-2 text-yellow-400">(Your Turn)</span>
            )}
          </p>
        </div>

        {/* Right: Search */}
        <div className="w-48">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search champions..."
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded
                       text-white placeholder-gray-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </header>
  )
}
