'use client'

/**
 * Turn Indicator Component
 *
 * Shows current turn number, phase, and whose turn it is
 * Updates reactively as draft progresses
 */

import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'

/**
 * Display format: "Turn 7/20 • Pick Phase 1 • BLUE'S TURN"
 * Color codes based on current team
 * Shows "DRAFT COMPLETE" when isComplete === true
 */
export function TurnIndicator() {
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const isComplete = useDraftStore((state) => state.isComplete)

  const turnInfo = getTurnInfo(currentTurn)

  // Draft not started yet
  if (currentTurn === 0) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-400">
          Ready to start • Select your side
        </div>
      </div>
    )
  }

  // Draft complete
  if (isComplete || currentTurn > 20) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-green-500/20 border border-green-500 rounded text-sm font-semibold text-green-400">
          DRAFT COMPLETE
        </div>
      </div>
    )
  }

  if (!turnInfo) {
    return null
  }

  // Phase display names
  const phaseNames: Record<string, string> = {
    ban1: 'Ban Phase 1',
    pick1: 'Pick Phase 1',
    ban2: 'Ban Phase 2',
    pick2: 'Pick Phase 2',
  }

  const phaseName = phaseNames[turnInfo.phase] || turnInfo.phase

  // Team color classes
  const teamColorClass = turnInfo.side === 'blue' ? 'text-blue-400' : 'text-red-400'
  const teamName = turnInfo.side.toUpperCase()

  // Progress percentage
  const progressPercent = (currentTurn / 20) * 100

  return (
    <div className="flex items-center gap-4">
      {/* Turn info */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">
          Turn <span className="font-semibold text-white">{currentTurn}/20</span>
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-gray-300">{phaseName}</span>
        <span className="text-gray-600">•</span>
        <span className={`font-semibold ${teamColorClass}`}>
          {teamName}'S TURN
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-red-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
