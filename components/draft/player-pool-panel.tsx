'use client'

/**
 * Player pool analysis panel component
 *
 * Displays a selected player's champion pool with:
 * - Champions grouped by comfort level (Signature, Comfort, Other)
 * - Win rate with color coding
 * - Games played count
 * - Flex role indicators
 * - Availability status (dimmed if picked/banned)
 *
 * @example
 * <PlayerPoolPanel
 *   playerId="faker-uuid"
 *   playerName="Faker"
 *   role="mid"
 * />
 */

import { usePlayerPool, ChampionPoolEntry } from '@/lib/hooks/use-player-pool'
import { useDraftStore } from '@/lib/draft/store'

interface PlayerPoolPanelProps {
  playerId: string | null
  playerName: string | null
  role: string
}

/**
 * Player champion pool analysis panel
 *
 * Features:
 * - Loads player data via usePlayerPool hook
 * - Groups champions by comfort level (signature, comfort, other)
 * - Shows win rate with color coding
 * - Displays games played count
 * - Indicates flex picks (multi-role champions)
 * - Dims unavailable champions (banned/picked)
 * - Loading skeleton state
 * - Empty state when no player selected
 */
export function PlayerPoolPanel({
  playerId,
  playerName,
  role,
}: PlayerPoolPanelProps) {
  const { data, loading, error } = usePlayerPool(playerId)
  const availableChampions = useDraftStore((state) => state.availableChampions)

  // Empty state - no player selected
  if (!playerId) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400 h-full flex items-center justify-center">
        <div>
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <p>Select a player to view their champion pool</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center text-red-400">
        <svg
          className="w-10 h-10 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p>Failed to load player data</p>
        <p className="text-sm text-gray-500 mt-1">
          {error?.message || 'Unknown error'}
        </p>
      </div>
    )
  }

  // Group champions by comfort level
  const signature = data.championPool.filter(
    (c) => c.comfortLevel === 'signature'
  )
  const comfort = data.championPool.filter((c) => c.comfortLevel === 'comfort')
  const others = data.championPool.filter(
    (c) => c.comfortLevel !== 'signature' && c.comfortLevel !== 'comfort'
  )

  return (
    <div className="bg-gray-800 rounded-lg p-4 overflow-y-auto">
      {/* Player header */}
      <h3 className="text-lg font-semibold text-white mb-1">
        {playerName || data.playerName}
      </h3>
      <p className="text-sm text-gray-400 mb-4 uppercase font-medium">{role}</p>

      {/* Signature Champions */}
      {signature.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
            <span className="text-amber-500">*</span> Signature Champions
            <span className="text-xs text-gray-500 font-normal">
              (10+ games, 55%+ WR)
            </span>
          </h4>
          <div className="space-y-2">
            {signature.map((champ) => (
              <ChampionPoolRow
                key={champ.champion}
                champion={champ}
                isAvailable={availableChampions.has(champ.champion)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comfort Champions */}
      {comfort.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Comfort Picks
            <span className="text-xs text-gray-500 font-normal">
              (5+ games, 50%+ WR)
            </span>
          </h4>
          <div className="space-y-2">
            {comfort.map((champ) => (
              <ChampionPoolRow
                key={champ.champion}
                champion={champ}
                isAvailable={availableChampions.has(champ.champion)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Champions */}
      {others.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Other Picks
          </h4>
          <div className="space-y-2">
            {others.slice(0, 5).map((champ) => (
              <ChampionPoolRow
                key={champ.champion}
                champion={champ}
                isAvailable={availableChampions.has(champ.champion)}
              />
            ))}
            {others.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{others.length - 5} more champions
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty pool state */}
      {data.championPool.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>No champion pool data available</p>
          <p className="text-sm text-gray-500 mt-1">
            This player may not have recent games in our database
          </p>
        </div>
      )}

      {/* Response time indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && data.meta && (
        <p className="text-xs text-gray-600 mt-4 text-right">
          Loaded in {data.meta.responseTime}ms
        </p>
      )}
    </div>
  )
}

/**
 * Individual champion row in the pool panel
 */
function ChampionPoolRow({
  champion,
  isAvailable,
}: {
  champion: ChampionPoolEntry
  isAvailable: boolean
}) {
  const { champion: name, gamesPlayed, winRate, roles } = champion

  // Win rate color coding
  const winRateColor =
    winRate >= 0.55
      ? 'text-green-400'
      : winRate >= 0.5
        ? 'text-white'
        : 'text-red-400'

  return (
    <div
      className={`
        flex items-center justify-between p-2 rounded relative
        ${isAvailable ? 'bg-gray-700' : 'bg-gray-700/50 opacity-50'}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Champion avatar placeholder */}
        <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center text-sm font-bold text-gray-300 shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="text-white text-sm font-medium truncate">{name}</div>
          {/* Flex indicator - show if played in multiple roles */}
          {roles.length > 1 && (
            <div className="text-xs text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Flex: {roles.join('/')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-right shrink-0 ml-2">
        <div className={`text-sm font-semibold ${winRateColor}`}>
          {(winRate * 100).toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400">{gamesPlayed} games</div>
      </div>

      {/* Unavailable indicator */}
      {!isAvailable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-red-400 bg-gray-900/80 px-2 py-0.5 rounded">
            UNAVAILABLE
          </span>
        </div>
      )}
    </div>
  )
}
