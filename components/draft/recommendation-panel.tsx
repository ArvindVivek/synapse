'use client'

/**
 * Recommendation Panel Component
 *
 * Displays top 3 pick recommendations with scoring breakdown and reasoning.
 * Shows during pick phases, hidden during ban phases.
 *
 * Features:
 * - Rank badges (gold, silver, bronze)
 * - Score percentage with color coding
 * - Visual breakdown bar showing component scores
 * - Reasoning bullets (max 2)
 * - Confidence badge
 * - Quick "Pick" button when it's user's turn
 * - Current phase weights display
 */

import { useRecommendations } from '@/lib/hooks/use-recommendations'
import { useDraftStore } from '@/lib/draft/store'
import type { PickRecommendation, ScoringWeights } from '@/lib/recommendations/types'

/**
 * Main recommendation panel component
 */
export function RecommendationPanel() {
  const { data, loading, error } = useRecommendations()
  const phase = useDraftStore((state) => state.phase)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())
  const executePick = useDraftStore((state) => state.executePick)

  // Don't show during ban phases
  if (phase === 'ban1' || phase === 'ban2') {
    return null
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Pick Recommendations</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Pick Recommendations</h3>
        <p className="text-red-400 text-sm">Failed to load recommendations</p>
      </div>
    )
  }

  if (!data || data.recommendations.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Pick Recommendations</h3>
        <p className="text-gray-400 text-sm">No recommendations available</p>
      </div>
    )
  }

  // Take top 3
  const topPicks = data.recommendations.slice(0, 3)

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Pick Recommendations</h3>
        <span className="text-xs text-gray-400">
          {data.meta.responseTime}ms | {data.meta.candidatesScored} scored
        </span>
      </div>

      <div className="space-y-3">
        {topPicks.map((rec, index) => (
          <RecommendationCard
            key={rec.champion}
            rec={rec}
            rank={index + 1}
            isMyTurn={isMyTurn}
            onPick={() => executePick(rec.champion)}
          />
        ))}
      </div>

      {/* Current weights */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Current Phase Weights:</p>
        <div className="flex gap-2 flex-wrap text-xs">
          <WeightBadge label="SYN" value={data.meta.weights.synergy} color="blue" />
          <WeightBadge label="CTR" value={data.meta.weights.counter} color="red" />
          <WeightBadge label="CMP" value={data.meta.weights.composition} color="green" />
          <WeightBadge label="SIDE" value={data.meta.weights.side} color="purple" />
          <WeightBadge label="FLEX" value={data.meta.weights.flex} color="amber" />
        </div>
      </div>
    </div>
  )
}

/**
 * Individual recommendation card
 */
function RecommendationCard({
  rec,
  rank,
  isMyTurn,
  onPick,
}: {
  rec: PickRecommendation
  rank: number
  isMyTurn: boolean
  onPick: () => void
}) {
  const totalScore = (rec.totalScore * 100).toFixed(0)

  // Rank badge colors
  const rankColors: Record<number, string> = {
    1: 'bg-yellow-500 text-black',
    2: 'bg-gray-400 text-black',
    3: 'bg-amber-700 text-white',
  }

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400'
    if (score >= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Confidence badge colors
  const confidenceColors: Record<string, string> = {
    high: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-red-500/20 text-red-400',
  }

  return (
    <div
      className={`
        bg-gray-700 rounded-lg p-3
        ${rank === 1 ? 'ring-2 ring-yellow-500' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold
            ${rankColors[rank] || 'bg-gray-600 text-white'}
          `}
        >
          {rank}
        </div>

        {/* Champion info */}
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">{rec.champion}</span>
            <span className={`text-sm font-bold ${getScoreColor(rec.totalScore)}`}>
              {totalScore}%
            </span>
          </div>

          {/* Score breakdown bar */}
          <div className="flex gap-0.5 mt-2 h-2 rounded overflow-hidden bg-gray-600">
            <ScoreBar value={rec.scores.synergy} color="bg-blue-500" title="Synergy" />
            <ScoreBar value={rec.scores.counter} color="bg-red-500" title="Counter" />
            <ScoreBar value={rec.scores.composition} color="bg-green-500" title="Composition" />
            <ScoreBar value={rec.scores.side} color="bg-purple-500" title="Side" />
            <ScoreBar value={rec.scores.flex} color="bg-amber-500" title="Flex" />
          </div>

          {/* Reasoning */}
          {rec.reasoning && rec.reasoning.length > 0 && (
            <ul className="mt-2 space-y-1">
              {rec.reasoning.slice(0, 2).map((reason: string, i: number) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-1">
                  <span className="text-gray-500">-</span>
                  {reason}
                </li>
              ))}
            </ul>
          )}

          {/* Confidence badge and Pick button */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`
                text-xs px-2 py-0.5 rounded
                ${confidenceColors[rec.confidence] || 'bg-gray-500/20 text-gray-400'}
              `}
            >
              {rec.confidence} confidence
            </span>

            {isMyTurn && (
              <button
                onClick={onPick}
                className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                Pick
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Score bar segment for breakdown visualization
 */
function ScoreBar({
  value,
  color,
  title,
}: {
  value: number
  color: string
  title: string
}) {
  // Width as percentage of total (each component max is 1.0, but actual weights vary)
  // We show relative contribution by scaling to reasonable visual width
  const width = Math.max(value * 100, 2) // Minimum 2% for visibility

  return (
    <div
      className={color}
      style={{ width: `${width}%` }}
      title={`${title}: ${(value * 100).toFixed(0)}%`}
    />
  )
}

/**
 * Weight badge showing current phase scoring weight
 */
function WeightBadge({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }

  return (
    <span className={`px-2 py-0.5 rounded border ${colorClasses[color] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {label}: {(value * 100).toFixed(0)}%
    </span>
  )
}
