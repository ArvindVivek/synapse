'use client'

/**
 * Win Rate Gauge Component
 *
 * Animated circular gauge showing real-time win-rate projection.
 * Features:
 * - Circular progress bar with smooth animations
 * - Color-coded based on win probability
 * - Side indicator badge (Blue/Red)
 * - Confidence level badge
 * - Hover tooltip with breakdown by category
 * - Loading spinner overlay during updates
 *
 * Uses framer-motion for animations and react-circular-progressbar for the gauge.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { useWinRate, WinRateBreakdown } from '@/lib/hooks/use-winrate'
import { useDraftStore } from '@/lib/draft/store'
import { useState } from 'react'

/**
 * Main win-rate gauge component
 *
 * Displays animated circular progress showing user's win probability.
 * Hover to see breakdown tooltip.
 *
 * @example
 * ```tsx
 * <WinRateGauge />
 * ```
 */
export function WinRateGauge() {
  const { userWinRate, breakdown, confidence, loading } = useWinRate()
  const userSide = useDraftStore((state) => state.userSide)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const percentage = Math.round(userWinRate * 100)
  const isWinning = percentage >= 50

  // Color based on win probability thresholds
  const getPathColor = () => {
    if (percentage >= 60) return '#22c55e' // green-500 (strong lead)
    if (percentage >= 50) return '#84cc16' // lime-500 (slight advantage)
    if (percentage >= 40) return '#eab308' // yellow-500 (slight disadvantage)
    return '#ef4444' // red-500 (behind)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      {/* Main gauge */}
      <motion.div
        className="w-28 h-28"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <CircularProgressbar
          value={percentage}
          text={`${percentage}%`}
          styles={buildStyles({
            pathColor: getPathColor(),
            textColor: '#ffffff',
            textSize: '24px',
            trailColor: '#374151', // gray-700
            pathTransitionDuration: 0.5,
          })}
        />
      </motion.div>

      {/* Side indicator badge */}
      <div
        className={`
          absolute -bottom-1 left-1/2 -translate-x-1/2
          px-2 py-0.5 rounded-full text-xs font-bold uppercase
          ${userSide === 'blue' ? 'bg-blue-600' : 'bg-red-600'}
        `}
      >
        {userSide}
      </div>

      {/* Confidence badge */}
      <div
        className={`
          absolute -top-1 -right-1
          px-1.5 py-0.5 rounded text-xs font-semibold
          ${confidence === 'high' ? 'bg-green-500/20 text-green-400' : ''}
          ${confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          ${confidence === 'low' ? 'bg-gray-500/20 text-gray-400' : ''}
        `}
      >
        {confidence}
      </div>

      {/* Breakdown tooltip */}
      <AnimatePresence>
        {showBreakdown && breakdown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="
              absolute top-full mt-4 left-1/2 -translate-x-1/2
              bg-gray-900 rounded-lg p-4 shadow-xl z-30
              min-w-[220px] border border-gray-700
            "
          >
            <h4 className="text-white font-semibold mb-3 text-sm">
              Win Rate Breakdown
            </h4>

            <div className="space-y-2">
              <BreakdownRow
                label="Base (50%)"
                value={0.50}
                color="bg-gray-500"
                isBase
              />
              <BreakdownRow
                label="Composition"
                value={breakdown.baseComposition}
                color="bg-purple-500"
              />
              <BreakdownRow
                label="Synergies"
                value={breakdown.synergies}
                color="bg-blue-500"
              />
              <BreakdownRow
                label="Matchups"
                value={breakdown.matchups}
                color="bg-orange-500"
              />
              <BreakdownRow
                label={`${userSide === 'blue' ? 'Blue' : 'Red'} Side`}
                value={breakdown.sideAdvantage}
                color={userSide === 'blue' ? 'bg-blue-400' : 'bg-red-400'}
              />
            </div>

            {/* Total row */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Projected Win Rate</span>
                <span
                  className={`font-bold ${isWinning ? 'text-green-400' : 'text-red-400'}`}
                >
                  {percentage}%
                </span>
              </div>
            </div>

            {/* Arrow pointing up */}
            <div
              className="
                absolute -top-2 left-1/2 -translate-x-1/2
                w-0 h-0
                border-l-8 border-r-8 border-b-8
                border-l-transparent border-r-transparent border-b-gray-900
              "
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-full">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

/**
 * Breakdown row component for tooltip
 *
 * Shows a single breakdown category with colored indicator,
 * label, and signed percentage value.
 */
function BreakdownRow({
  label,
  value,
  color,
  isBase = false,
}: {
  label: string
  value: number
  color: string
  isBase?: boolean
}) {
  const percentage = value * 100
  const sign = isBase ? '' : (percentage >= 0 ? '+' : '')
  const displayValue = isBase ? '50.0' : percentage.toFixed(1)

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-gray-300">{label}</span>
      </div>
      <span
        className={
          isBase
            ? 'text-gray-400'
            : percentage >= 0
              ? 'text-green-400'
              : 'text-red-400'
        }
      >
        {sign}{displayValue}%
      </span>
    </div>
  )
}

/**
 * Compact win-rate display for header/sidebar use
 *
 * Shows just the percentage with color coding, no breakdown tooltip.
 */
export function CompactWinRateDisplay() {
  const { userWinRate, confidence, loading } = useWinRate()
  const percentage = Math.round(userWinRate * 100)

  const getColor = () => {
    if (percentage >= 60) return 'text-green-400'
    if (percentage >= 50) return 'text-lime-400'
    if (percentage >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <span className="text-gray-400 animate-pulse">---%</span>
    )
  }

  return (
    <span className={`font-bold ${getColor()}`} title={`Confidence: ${confidence}`}>
      {percentage}%
    </span>
  )
}
