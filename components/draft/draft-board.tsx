'use client'

/**
 * Draft Board Component
 *
 * Displays Blue vs Red team compositions with ban/pick phases
 * Shows current turn's team with visual highlight
 */

import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'

/**
 * Team Column Component
 *
 * Displays one team's bans and picks with visual sections
 */
function TeamColumn({
  side,
  bans,
  picks,
  isCurrentTurn,
}: {
  side: 'blue' | 'red'
  bans: string[]
  picks: Array<{ champion: string; role: string | null }>
  isCurrentTurn: boolean
}) {
  const sideColor = side === 'blue' ? 'blue-500' : 'red-500'
  const sideColorDark = side === 'blue' ? 'blue-600' : 'red-600'

  // Split bans into phase 1 (first 3) and phase 2 (last 2)
  const bansPhase1 = bans.slice(0, 3)
  const bansPhase2 = bans.slice(3, 5)

  // Split picks into phase 1 (first 3) and phase 2 (last 2)
  const picksPhase1 = picks.slice(0, 3)
  const picksPhase2 = picks.slice(3, 5)

  return (
    <div
      className={`
        bg-gray-800 rounded-lg p-4 transition-all
        ${isCurrentTurn ? `ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900` : ''}
      `}
    >
      {/* Team Header */}
      <div className={`text-center py-2 mb-4 bg-${sideColor}/20 border border-${sideColor} rounded`}>
        <h3 className={`text-lg font-bold text-${sideColor} uppercase`}>
          {side} Side
        </h3>
      </div>

      {/* Ban Phase 1 */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Bans (Phase 1)
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => {
            const champion = bansPhase1[index]
            return (
              <div
                key={`ban1-${index}`}
                className="aspect-square bg-gray-700 rounded flex items-center justify-center text-xs text-center p-1 border border-gray-600"
              >
                {champion ? (
                  <span className="font-semibold text-white truncate">{champion}</span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Picks Phase 1 */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Picks
        </h4>
        <div className="space-y-2">
          {[0, 1, 2].map((index) => {
            const pick = picksPhase1[index]
            return (
              <div
                key={`pick1-${index}`}
                className="h-14 bg-gray-700 rounded flex items-center px-3 border border-gray-600"
              >
                {pick ? (
                  <>
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm">{pick.champion}</div>
                      {pick.role && (
                        <div className="text-xs text-gray-400 capitalize">{pick.role}</div>
                      )}
                    </div>
                    {pick.role && (
                      <div className={`px-2 py-1 bg-${sideColorDark} rounded text-xs font-semibold uppercase`}>
                        {pick.role}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">Empty slot</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Ban Phase 2 */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Bans (Phase 2)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((index) => {
            const champion = bansPhase2[index]
            return (
              <div
                key={`ban2-${index}`}
                className="aspect-square bg-gray-700 rounded flex items-center justify-center text-xs text-center p-1 border border-gray-600"
              >
                {champion ? (
                  <span className="font-semibold text-white truncate">{champion}</span>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Picks Phase 2 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          Picks (Phase 2)
        </h4>
        <div className="space-y-2">
          {[0, 1].map((index) => {
            const pick = picksPhase2[index]
            return (
              <div
                key={`pick2-${index}`}
                className="h-14 bg-gray-700 rounded flex items-center px-3 border border-gray-600"
              >
                {pick ? (
                  <>
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm">{pick.champion}</div>
                      {pick.role && (
                        <div className="text-xs text-gray-400 capitalize">{pick.role}</div>
                      )}
                    </div>
                    {pick.role && (
                      <div className={`px-2 py-1 bg-${sideColorDark} rounded text-xs font-semibold uppercase`}>
                        {pick.role}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">Empty slot</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Draft Board - Main Component
 *
 * Shows both Blue and Red team compositions side by side
 * Highlights current turn's team
 */
export function DraftBoard() {
  const blueBans = useDraftStore((state) => state.blue.bans)
  const bluePicks = useDraftStore((state) => state.blue.picks)
  const redBans = useDraftStore((state) => state.red.bans)
  const redPicks = useDraftStore((state) => state.red.picks)
  const currentTurn = useDraftStore((state) => state.currentTurn)

  const turnInfo = getTurnInfo(currentTurn)
  const isBlueCurrentTurn = turnInfo?.side === 'blue'
  const isRedCurrentTurn = turnInfo?.side === 'red'

  return (
    <div className="space-y-4">
      {/* Blue Team */}
      <TeamColumn
        side="blue"
        bans={blueBans}
        picks={bluePicks}
        isCurrentTurn={isBlueCurrentTurn}
      />

      {/* Red Team */}
      <TeamColumn
        side="red"
        bans={redBans}
        picks={redPicks}
        isCurrentTurn={isRedCurrentTurn}
      />
    </div>
  )
}
