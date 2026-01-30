'use client'

/**
 * Ban Strategy Panel Component
 *
 * Displays ban recommendations during ban phases.
 * Shows target bans (player-specific) and priority bans (meta).
 *
 * Features:
 * - Separate sections for target and priority bans
 * - Target bans show which player they're targeting
 * - Quick "Ban" button when it's user's turn
 * - Phase info showing which ban phase (1 or 2)
 * - Hidden during pick phases
 */

import { useBans, type BanRecommendation } from '@/lib/hooks/use-bans'
import { useDraftStore } from '@/lib/draft/store'

/**
 * Main ban strategy panel component
 */
export function BanStrategyPanel() {
  const { data, loading, error } = useBans()
  const phase = useDraftStore((state) => state.phase)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())
  const executeBan = useDraftStore((state) => state.executeBan)

  // Only show during ban phases
  if (phase !== 'ban1' && phase !== 'ban2') {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Ban Recommendations</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Ban Recommendations</h3>
        <p className="text-red-400 text-sm">Failed to load ban recommendations</p>
      </div>
    )
  }

  if (!data || data.recommendations.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Ban Recommendations</h3>
        <p className="text-gray-400 text-sm">No ban recommendations available</p>
      </div>
    )
  }

  // Separate target bans (player-specific) from priority bans (meta)
  const targetBans = data.recommendations.filter((b) => b.category === 'target')
  const priorityBans = data.recommendations.filter((b) => b.category === 'priority')

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Ban Recommendations</h3>
        <span className="text-xs text-gray-400">{data.meta.responseTime}ms</span>
      </div>

      {/* Target Bans (player-specific) */}
      {targetBans.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-red-400 mb-2">Target Bans</h4>
          <div className="space-y-2">
            {targetBans.map((ban) => (
              <BanCard
                key={ban.champion}
                ban={ban}
                isMyTurn={isMyTurn}
                onBan={() => executeBan(ban.champion)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Priority Bans (meta) */}
      {priorityBans.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-2">Priority Bans</h4>
          <div className="space-y-2">
            {priorityBans.slice(0, 5).map((ban) => (
              <BanCard
                key={ban.champion}
                ban={ban}
                isMyTurn={isMyTurn}
                onBan={() => executeBan(ban.champion)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          {phase === 'ban1' ? 'Ban Phase 1: 3 bans each side' : 'Ban Phase 2: 2 bans each side'}
        </p>
      </div>
    </div>
  )
}

/**
 * Individual ban card
 */
function BanCard({
  ban,
  isMyTurn,
  onBan,
}: {
  ban: BanRecommendation
  isMyTurn: boolean
  onBan: () => void
}) {
  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-red-400'
    if (score >= 0.5) return 'text-orange-400'
    return 'text-yellow-400'
  }

  return (
    <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
      <div className="flex items-center gap-2">
        {/* Champion initial badge */}
        <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center text-sm font-bold text-red-400">
          {ban.champion.charAt(0)}
        </div>
        <div>
          <div className="text-white text-sm font-medium">{ban.champion}</div>
          <div className="text-xs text-gray-400">
            {ban.targetPlayer ? `Target: ${ban.targetPlayer}` : ban.reason}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-sm ${getScoreColor(ban.score)}`}>
          {(ban.score * 100).toFixed(0)}%
        </span>
        {isMyTurn && (
          <button
            onClick={onBan}
            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
          >
            Ban
          </button>
        )}
      </div>
    </div>
  )
}
