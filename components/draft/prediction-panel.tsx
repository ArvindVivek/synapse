'use client'

/**
 * Prediction Panel Component
 *
 * Displays opponent pick predictions with probability bars.
 * Shows top predicted champions for each selected opponent player,
 * with color-coded bars and hover tooltips for reasoning.
 */

import { usePredictions } from '@/lib/hooks/use-predictions'
import { useDraftStore } from '@/lib/draft/store'

/**
 * Props for the PredictionPanel component
 */
interface PredictionPanelProps {
  /** Selected opponent players by role */
  selectedPlayers: {
    top: { id: string; name: string } | null
    jungle: { id: string; name: string } | null
    mid: { id: string; name: string } | null
    adc: { id: string; name: string } | null
    support: { id: string; name: string } | null
  }
}

/** Roles in draft order */
const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const
type RoleKey = typeof ROLES[number]

/**
 * PredictionPanel - Main Component
 *
 * Shows predictions for each selected opponent player.
 * Empty state when no players selected.
 */
export function PredictionPanel({ selectedPlayers }: PredictionPanelProps) {
  const currentTurn = useDraftStore((state) => state.currentTurn)

  // Filter to players who have a selection
  const playersToPredict = ROLES
    .map(role => ({
      role,
      player: selectedPlayers[role],
    }))
    .filter(p => p.player !== null)

  // Empty state
  if (playersToPredict.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Opponent Predictions
        </h3>
        <p className="text-gray-400 text-sm">
          Select opponent players to see pick predictions
        </p>
      </div>
    )
  }

  // Draft not started state
  if (currentTurn === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Opponent Predictions
        </h3>
        <p className="text-gray-400 text-sm">
          Predictions will appear once the draft begins
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Opponent Predictions
      </h3>

      <div className="space-y-4">
        {playersToPredict.map(({ role, player }) => (
          <PlayerPredictionCard
            key={role}
            playerId={player!.id}
            playerName={player!.name}
            role={role}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual player prediction card
 *
 * Fetches and displays predictions for a single player.
 * Shows loading skeleton while fetching, error state on failure.
 */
function PlayerPredictionCard({
  playerId,
  playerName,
  role,
}: {
  playerId: string
  playerName: string
  role: RoleKey
}) {
  const { data, loading, error } = usePredictions(playerId, playerName, role)
  const availableChampions = useDraftStore((state) => state.availableChampions)

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-700 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <RoleBadge role={role} />
          <span className="text-white font-medium">{playerName}</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-600 rounded w-full"></div>
          <div className="h-6 bg-gray-600 rounded w-3/4"></div>
          <div className="h-6 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="bg-gray-700 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <RoleBadge role={role} />
          <span className="text-white font-medium">{playerName}</span>
        </div>
        <p className="text-red-400 text-sm">Failed to load predictions</p>
      </div>
    )
  }

  // Filter to available champions and take top 5
  const availablePredictions = data.predictions
    .filter(p => availableChampions.has(p.champion))
    .slice(0, 5)

  return (
    <div className="bg-gray-700 rounded p-3">
      <div className="flex items-center gap-2 mb-3">
        <RoleBadge role={role} />
        <span className="text-white font-medium">{playerName}</span>
      </div>

      {availablePredictions.length === 0 ? (
        <p className="text-gray-400 text-sm">No predictions available</p>
      ) : (
        <div className="space-y-2">
          {availablePredictions.map((pred) => (
            <PredictionBar
              key={pred.champion}
              champion={pred.champion}
              probability={pred.probability}
              reasoning={pred.reasoning}
              comfortLevel={pred.comfortLevel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Probability bar for a predicted champion
 *
 * Color coding:
 * - Red (>40%): High probability pick
 * - Orange (25-40%): Medium probability
 * - Yellow (<25%): Lower probability
 *
 * Hover tooltip shows reasoning for the prediction.
 */
function PredictionBar({
  champion,
  probability,
  reasoning,
  comfortLevel,
}: {
  champion: string
  probability: number
  reasoning?: string
  comfortLevel?: 'signature' | 'comfort' | 'occasional' | 'rare'
}) {
  const percentage = (probability * 100).toFixed(0)
  const barWidth = Math.max(probability * 100, 5) // Min 5% width for visibility

  // Determine color based on probability thresholds
  const getBarColor = () => {
    if (probability >= 0.4) return 'bg-red-500'
    if (probability >= 0.25) return 'bg-orange-500'
    return 'bg-yellow-500'
  }

  const getTextColor = () => {
    if (probability >= 0.4) return 'text-red-400'
    if (probability >= 0.25) return 'text-orange-400'
    return 'text-yellow-400'
  }

  // Format comfort level for display
  const formatComfortLevel = (level?: string) => {
    if (!level) return null
    const labels: Record<string, string> = {
      signature: 'Signature',
      comfort: 'Comfort',
      occasional: 'Occasional',
      rare: 'Rare',
    }
    return labels[level] || level
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        {/* Champion name */}
        <span className="w-24 text-sm text-white truncate" title={champion}>
          {champion}
        </span>

        {/* Probability bar */}
        <div className="flex-1 h-5 bg-gray-600 rounded overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getBarColor()}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {/* Percentage */}
        <span className={`w-12 text-right text-sm font-semibold ${getTextColor()}`}>
          {percentage}%
        </span>
      </div>

      {/* Tooltip with reasoning */}
      {(reasoning || comfortLevel) && (
        <div className="
          absolute left-0 bottom-full mb-2 p-2 bg-gray-900 rounded shadow-lg
          opacity-0 group-hover:opacity-100 transition-opacity z-10
          text-xs text-gray-300 w-64 pointer-events-none
        ">
          <p className="font-semibold text-white mb-1">{champion}</p>
          {comfortLevel && (
            <p className="text-gray-400 mb-1">
              {formatComfortLevel(comfortLevel)} pick
            </p>
          )}
          {reasoning && (
            <p className="text-gray-300">{reasoning}</p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Role badge component
 *
 * Displays the role with a color-coded background.
 */
function RoleBadge({ role }: { role: RoleKey }) {
  const colors: Record<RoleKey, string> = {
    top: 'bg-yellow-600',
    jungle: 'bg-green-600',
    mid: 'bg-blue-600',
    adc: 'bg-red-600',
    support: 'bg-cyan-600',
  }

  return (
    <span className={`
      px-2 py-0.5 text-xs font-bold uppercase rounded text-white
      ${colors[role]}
    `}>
      {role}
    </span>
  )
}

/**
 * Compact prediction panel for sidebar use
 *
 * Shows a condensed version with fewer predictions per player.
 */
export function CompactPredictionPanel({ selectedPlayers }: PredictionPanelProps) {
  const currentTurn = useDraftStore((state) => state.currentTurn)

  // Filter to players who have a selection
  const playersToPredict = ROLES
    .map(role => ({
      role,
      player: selectedPlayers[role],
    }))
    .filter(p => p.player !== null)

  if (playersToPredict.length === 0 || currentTurn === 0) {
    return null
  }

  return (
    <div className="bg-gray-800/50 rounded p-2 space-y-2">
      <h4 className="text-sm font-medium text-gray-300">Likely Picks</h4>
      {playersToPredict.slice(0, 3).map(({ role, player }) => (
        <CompactPredictionRow
          key={role}
          playerId={player!.id}
          playerName={player!.name}
          role={role}
        />
      ))}
    </div>
  )
}

/**
 * Compact row showing top prediction for a player
 */
function CompactPredictionRow({
  playerId,
  playerName,
  role,
}: {
  playerId: string
  playerName: string
  role: RoleKey
}) {
  const { data, loading } = usePredictions(playerId, playerName, role)
  const availableChampions = useDraftStore((state) => state.availableChampions)

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">{playerName}:</span>
        <span className="text-gray-500">...</span>
      </div>
    )
  }

  const topPrediction = data.predictions.find(p => availableChampions.has(p.champion))

  if (!topPrediction) {
    return null
  }

  const percentage = (topPrediction.probability * 100).toFixed(0)

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-400 truncate w-16">{playerName}:</span>
      <span className="text-white font-medium truncate">{topPrediction.champion}</span>
      <span className={`
        ${topPrediction.probability >= 0.4 ? 'text-red-400' : ''}
        ${topPrediction.probability >= 0.25 && topPrediction.probability < 0.4 ? 'text-orange-400' : ''}
        ${topPrediction.probability < 0.25 ? 'text-yellow-400' : ''}
      `}>
        {percentage}%
      </span>
    </div>
  )
}
