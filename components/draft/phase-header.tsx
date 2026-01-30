'use client'

/**
 * Phase header component with prominent action indicator
 *
 * Displays "BAN A CHAMPION!" or "PICK A CHAMPION!" prominently,
 * along with turn info, role filters, and search.
 */

import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'
import {
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
  SearchIcon,
} from '@/components/ui/icons'
import { HelpButton } from './help-modal'

interface PhaseHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  roleFilter: string | null
  onRoleFilterChange: (role: string | null) => void
}

const ROLES = [
  { key: 'top', label: 'Top', Icon: TopIcon },
  { key: 'jungle', label: 'Jungle', Icon: JungleIcon },
  { key: 'mid', label: 'Mid', Icon: MidIcon },
  { key: 'adc', label: 'ADC', Icon: AdcIcon },
  { key: 'support', label: 'Support', Icon: SupportIcon },
]

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
          {ROLES.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => onRoleFilterChange(roleFilter === key ? null : key)}
              className={`p-2 rounded transition-colors ${
                roleFilter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={label}
            >
              <Icon className="w-5 h-5" />
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

        {/* Right: Search and Help */}
        <div className="flex items-center gap-2">
          <div className="w-48 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <HelpButton />
        </div>
      </div>
    </header>
  )
}
