'use client'

/**
 * AI Insights Panel - Scouting Report Style
 *
 * Transformed into a visual scouting report with:
 * - Animated win rate gauge
 * - Clear phase indicators
 * - Visual composition analysis
 * - Smart recommendations with clear reasoning
 * - "How to Win" strategic insights
 * - Clickable recommendations that select champions
 * - Highlights synchronized with main grid
 */

import { useEffect, useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { useRecommendations } from '@/lib/hooks/use-recommendations'
import { useWinRate } from '@/lib/hooks/use-winrate'
import { getTurnInfo } from '@/lib/draft/sequence'
import { getChampionImageUrl } from '@/lib/draft/champion-data'
import { assessTeamNeeds } from '@/lib/recommendations/champion-properties'
import { useHighlights } from '@/lib/contexts/highlight-context'
import {
  BrainIcon,
  WarningIcon,
  StarIcon,
  TrendUpIcon,
  TrendDownIcon,
  ShieldCheckIcon,
  SwordsIcon,
  ZapIcon,
  TrophyIcon,
  TargetIcon,
  FlameIcon,
} from '@/components/ui/icons'

interface InsightsPanelProps {
  className?: string
}

export function InsightsPanel({ className = '' }: InsightsPanelProps) {
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const phase = useDraftStore((state) => state.phase)
  const userSide = useDraftStore((state) => state.userSide)
  const isComplete = useDraftStore((state) => state.isComplete)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())
  const selectChampion = useDraftStore((state) => state.selectChampion)
  const selectedChampion = useDraftStore((state) => state.selectedChampion)
  const userPicks = useDraftStore((state) =>
    userSide === 'blue' ? state.blue.picks : state.red.picks
  )
  const opponentPicks = useDraftStore((state) =>
    userSide === 'blue' ? state.red.picks : state.blue.picks
  )

  const { data: recsData, loading: recsLoading } = useRecommendations()
  const { userWinRate, breakdown, confidence } = useWinRate()
  const { setHighlights, clearHighlights } = useHighlights()

  // Memoize filtered recommendations to prevent infinite re-renders
  // The key is to create a stable reference based on actual data changes
  const filteredRecommendations = useMemo(() => {
    return recsData?.recommendations?.filter(
      (rec) => rec.champion !== selectedChampion
    ) || []
  }, [recsData?.recommendations, selectedChampion])

  // Track previous recommendations to avoid unnecessary highlight updates
  const prevRecsRef = useRef<string>('')

  const turnInfo = getTurnInfo(currentTurn)
  const isBanPhase = turnInfo?.action === 'ban'
  const winPct = Math.round(userWinRate * 100)

  // Assess team composition needs
  const userChampions = userPicks.map((p) => p.champion)
  const teamNeeds = assessTeamNeeds(userChampions)

  // Generate composition warnings and insights
  const compInsights = generateCompInsights(teamNeeds, userPicks.length)

  // Set highlights when recommendations change
  // Use a string key to detect actual content changes, not just array reference changes
  useEffect(() => {
    const recsKey = filteredRecommendations.map(r => r.champion).join(',')

    // Only update if recommendations actually changed
    if (recsKey === prevRecsRef.current && !isComplete) {
      return
    }
    prevRecsRef.current = recsKey

    if (filteredRecommendations.length > 0 && isMyTurn && !isComplete) {
      const highlights = filteredRecommendations.slice(0, 5).map((rec, idx) => ({
        champion: rec.champion,
        type: 'recommendation' as const,
        score: 1 - idx * 0.15, // Top pick gets highest score
      }))
      setHighlights(highlights)
    } else if (isComplete || !isMyTurn) {
      clearHighlights()
    }
  }, [filteredRecommendations, isMyTurn, isComplete, setHighlights, clearHighlights])

  const handleRecommendationClick = (champion: string) => {
    if (!isMyTurn) return
    selectChampion(champion)
  }

  return (
    <div
      className={`flex flex-col bg-gradient-to-b from-gray-900/95 to-gray-900 border-l border-gray-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <BrainIcon className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">SYNAPSE INSIGHTS</h3>
        </div>
        <p className="text-[10px] text-cyan-400/70 mt-0.5">AI-Powered Draft Analysis</p>
      </div>

      {/* Win Rate Gauge */}
      <WinRateGauge winPct={winPct} breakdown={breakdown} confidence={confidence} />

      {/* Phase Indicator */}
      <PhaseIndicator
        currentTurn={currentTurn}
        phase={phase}
        isBanPhase={isBanPhase}
        isComplete={isComplete}
        isMyTurn={isMyTurn}
      />

      {/* Composition Analysis */}
      <CompositionAnalysis
        insights={compInsights}
        userPicks={userPicks.length}
      />

      {/* Recommendations / How to Win */}
      <div className="flex-1 overflow-y-auto">
        {isComplete ? (
          <HowToWinSection winPct={winPct} userPicks={userPicks} opponentPicks={opponentPicks} />
        ) : (
          <RecommendationsSection
            recommendations={filteredRecommendations}
            meta={recsData?.meta}
            loading={recsLoading}
            isBanPhase={isBanPhase}
            isMyTurn={isMyTurn}
            onRecommendationClick={handleRecommendationClick}
          />
        )}
      </div>

      {/* Draft Complete Footer */}
      {isComplete && (
        <div className="p-3 border-t border-gray-800 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
          <a
            href="/draft/new"
            className="block w-full text-center py-2.5 bg-gradient-to-r from-blue-600 to-blue-700
                       hover:from-blue-500 hover:to-blue-600 text-white text-sm font-medium rounded-lg
                       transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
          >
            Start New Draft
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * Animated Win Rate Gauge with breakdown - CLICKABLE for detailed modal
 */
function WinRateGauge({
  winPct,
  breakdown,
  confidence,
}: {
  winPct: number
  breakdown: {
    synergies: number
    matchups: number
    baseComposition: number
    sideAdvantage: number
  } | null
  confidence: string
}) {
  const [showModal, setShowModal] = useState(false)

  const getWinRateStyle = () => {
    if (winPct >= 55) return { color: 'text-green-400', ring: 'ring-green-500', glow: 'shadow-green-500/30', gradient: 'from-green-500 to-emerald-500', label: 'Favorable' }
    if (winPct >= 45) return { color: 'text-yellow-400', ring: 'ring-yellow-500', glow: 'shadow-yellow-500/30', gradient: 'from-yellow-500 to-orange-500', label: 'Even' }
    return { color: 'text-red-400', ring: 'ring-red-500', glow: 'shadow-red-500/30', gradient: 'from-red-500 to-rose-500', label: 'Unfavorable' }
  }
  const style = getWinRateStyle()

  // Calculate circumference for SVG ring
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (winPct / 100) * circumference

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-4">
          {/* Circular gauge */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background ring */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-800"
              />
              {/* Progress ring */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="url(#winRateGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={winPct >= 55 ? 'text-green-500' : winPct >= 45 ? 'text-yellow-500' : 'text-red-500'} stopColor="currentColor" />
                  <stop offset="100%" className={winPct >= 55 ? 'text-emerald-400' : winPct >= 45 ? 'text-orange-400' : 'text-rose-400'} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${style.color} animate-stat-glow`}>{winPct}%</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider">Win Rate</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 capitalize">{confidence} confidence</span>
              {winPct >= 50 ? (
                <TrendUpIcon className="w-3 h-3 text-green-400" />
              ) : (
                <TrendDownIcon className="w-3 h-3 text-red-400" />
              )}
            </div>

            {breakdown && (
              <div className="space-y-1">
                <BreakdownBar label="Synergies" value={breakdown.synergies} icon={<ZapIcon className="w-3 h-3" />} />
                <BreakdownBar label="Matchups" value={breakdown.matchups} icon={<SwordsIcon className="w-3 h-3" />} />
                <BreakdownBar label="Comp" value={breakdown.baseComposition} icon={<ShieldCheckIcon className="w-3 h-3" />} />
                <BreakdownBar label="Side" value={breakdown.sideAdvantage} icon={<TargetIcon className="w-3 h-3" />} />
              </div>
            )}

            <div className="text-[9px] text-cyan-400/60 mt-1">Click for detailed analysis</div>
          </div>
        </div>
      </button>

      {/* Win Rate Insights Modal */}
      {showModal && (
        <WinRateModal
          winPct={winPct}
          breakdown={breakdown}
          confidence={confidence}
          style={style}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

/**
 * Detailed Win Rate Insights Modal
 */
function WinRateModal({
  winPct,
  breakdown,
  confidence,
  style,
  onClose,
}: {
  winPct: number
  breakdown: {
    synergies: number
    matchups: number
    baseComposition: number
    sideAdvantage: number
  } | null
  confidence: string
  style: { color: string; label: string }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              winPct >= 55 ? 'bg-green-500/20' : winPct >= 45 ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
              <span className={`text-xl font-bold ${style.color}`}>{winPct}%</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Win Rate Analysis</h3>
              <p className={`text-sm ${style.color}`}>{style.label} Draft Position</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Analysis Breakdown */}
        {breakdown && (
          <div className="space-y-4 mb-6">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider">Factor Breakdown</h4>

            <ModalBreakdownItem
              icon={<ZapIcon className="w-4 h-4" />}
              label="Team Synergies"
              value={breakdown.synergies}
              description="How well your champions work together (combos, peel, engage chains)"
            />
            <ModalBreakdownItem
              icon={<SwordsIcon className="w-4 h-4" />}
              label="Lane Matchups"
              value={breakdown.matchups}
              description="Individual lane advantages and counter-pick effectiveness"
            />
            <ModalBreakdownItem
              icon={<ShieldCheckIcon className="w-4 h-4" />}
              label="Composition Balance"
              value={breakdown.baseComposition}
              description="Damage types, frontline/backline balance, and utility coverage"
            />
            <ModalBreakdownItem
              icon={<TargetIcon className="w-4 h-4" />}
              label="Side Advantage"
              value={breakdown.sideAdvantage}
              description="Blue side has ~2% advantage from first pick; Red gets counter-pick"
            />
          </div>
        )}

        {/* Confidence Explanation */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BrainIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Confidence: {confidence}</span>
          </div>
          <p className="text-xs text-gray-400">
            {confidence === 'low'
              ? 'Early in draft - predictions will become more accurate as more picks are made.'
              : confidence === 'medium'
              ? 'Mid-draft - key matchups are forming. Consider counter-picks carefully.'
              : 'Late draft - high prediction accuracy. Focus on completing your composition.'}
          </p>
        </div>

        {/* Strategic Insight */}
        <div className={`rounded-xl p-4 border ${
          winPct >= 55 ? 'bg-green-500/10 border-green-500/30' :
          winPct >= 45 ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <p className={`text-sm ${style.color}`}>
            {winPct >= 55
              ? 'Strong draft position! Play confidently and press your advantages early.'
              : winPct >= 45
              ? 'Even matchup. Focus on winning lanes and securing objectives.'
              : 'Difficult draft. Look for picks, avoid 5v5s until you scale, and play around power spikes.'}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  )
}

/**
 * Modal breakdown item with detailed description
 */
function ModalBreakdownItem({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode
  label: string
  value: number
  description: string
}) {
  const pct = Math.round(value * 100)
  const isPositive = pct >= 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={isPositive ? 'text-green-400' : 'text-red-400'}>{icon}</span>
          <span className="text-sm text-white font-medium">{label}</span>
        </div>
        <span className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{pct}%
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isPositive ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}`}
          style={{ width: `${Math.min(Math.abs(pct) + 50, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-500">{description}</p>
    </div>
  )
}

/**
 * Individual breakdown bar
 */
function BreakdownBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const pct = Math.round(value * 100)
  const isPositive = pct >= 0

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className={isPositive ? 'text-green-400/70' : 'text-red-400/70'}>{icon}</span>
      <span className="text-gray-500 w-12">{label}</span>
      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(Math.abs(pct) + 50, 100)}%` }}
        />
      </div>
      <span className={`w-8 text-right font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{pct}%
      </span>
    </div>
  )
}

/**
 * Phase indicator with visual state
 */
function PhaseIndicator({
  currentTurn,
  phase,
  isBanPhase,
  isComplete,
  isMyTurn,
}: {
  currentTurn: number
  phase: string
  isBanPhase: boolean
  isComplete: boolean
  isMyTurn: boolean
}) {
  const getPhaseInfo = () => {
    if (isComplete) return { label: 'DRAFT COMPLETE', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' }
    if (isBanPhase) {
      const phaseNum = phase === 'ban1' ? 1 : 2
      return {
        label: `BAN PHASE ${phaseNum}`,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
      }
    }
    const phaseNum = phase === 'pick1' ? 1 : 2
    return {
      label: `PICK PHASE ${phaseNum}`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    }
  }

  const info = getPhaseInfo()

  return (
    <div className={`mx-3 my-2 p-3 rounded-lg border ${info.border} ${info.bg} animate-fade-in`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${info.color} tracking-wide`}>{info.label}</span>
        {!isComplete && (
          <span className="text-[10px] text-gray-500">Turn {currentTurn}/20</span>
        )}
      </div>

      {!isComplete && (
        <>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-300 ${isBanPhase ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${(currentTurn / 20) * 100}%` }}
            />
          </div>

          {/* Action prompt */}
          <div className={`text-xs ${isMyTurn ? info.color : 'text-gray-500'}`}>
            {isMyTurn ? (
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isBanPhase ? 'bg-red-400' : 'bg-blue-400'} animate-pulse`} />
                {isBanPhase ? 'Select a champion to ban' : 'Select a champion to pick'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                Waiting for opponent...
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Generate composition insights based on team needs
 */
function generateCompInsights(teamNeeds: string[], pickCount: number) {
  const insights: Array<{ type: 'warning' | 'tip' | 'good'; message: string }> = []

  if (pickCount === 0) {
    insights.push({ type: 'tip', message: 'Draft a balanced composition with damage, frontline, and utility' })
    return insights
  }

  if (teamNeeds.includes('ap_damage')) {
    insights.push({ type: 'warning', message: 'Heavy AD composition - enemies can stack armor' })
  }
  if (teamNeeds.includes('ad_damage')) {
    insights.push({ type: 'warning', message: 'Heavy AP composition - enemies can stack magic resist' })
  }
  if (teamNeeds.includes('engage')) {
    insights.push({ type: 'warning', message: 'No reliable engage - consider champions with hard CC' })
  }
  if (teamNeeds.includes('frontline')) {
    insights.push({ type: 'warning', message: 'Squishy team - need tanks or bruisers for frontline' })
  }

  if (teamNeeds.length === 0 && pickCount >= 2) {
    insights.push({ type: 'good', message: 'Team composition looks balanced!' })
  }

  return insights
}

/**
 * Composition analysis section
 */
function CompositionAnalysis({
  insights,
  userPicks,
}: {
  insights: Array<{ type: 'warning' | 'tip' | 'good'; message: string }>
  userPicks: number
}) {
  if (insights.length === 0) return null

  return (
    <div className="px-3 py-2 border-b border-gray-800">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Composition Analysis</div>
      <div className="space-y-1.5">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-xs p-2 rounded-lg animate-slide-in-left ${
              insight.type === 'warning'
                ? 'bg-yellow-500/10 text-yellow-300'
                : insight.type === 'good'
                ? 'bg-green-500/10 text-green-300'
                : 'bg-blue-500/10 text-blue-300'
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {insight.type === 'warning' ? (
              <WarningIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            ) : insight.type === 'good' ? (
              <ShieldCheckIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            ) : (
              <BrainIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            )}
            <span>{insight.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Recommendations section with clear visual hierarchy
 */
function RecommendationsSection({
  recommendations,
  meta,
  loading,
  isBanPhase,
  isMyTurn,
  onRecommendationClick,
}: {
  recommendations: Array<{
    champion: string
    totalScore: number
    scores: {
      synergy: number
      counter: number
      composition: number
      side: number
      flex: number
    }
    confidence: string
    reasoning: string[]
  }>
  meta?: {
    responseTime: number
    turnNumber: number
    candidatesScored: number
  }
  loading: boolean
  isBanPhase: boolean
  isMyTurn: boolean
  onRecommendationClick: (champion: string) => void
}) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <StarIcon className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {isBanPhase ? 'Priority Bans' : 'Top Picks'}
        </span>
        {isMyTurn && recommendations.length > 0 && (
          <span className="text-[9px] text-cyan-400/70 ml-auto">Click to select</span>
        )}
      </div>

      {/* Meta info - data transparency */}
      {meta && !loading && (
        <div className="flex items-center gap-3 mb-3 text-[9px] text-gray-500">
          <span>Analyzed {meta.candidatesScored} champions</span>
          <span>•</span>
          <span>{meta.responseTime}ms</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-[10px] text-gray-500">Analyzing champions...</span>
        </div>
      ) : !isMyTurn ? (
        <div className="text-xs text-gray-500 text-center py-6 bg-gray-800/30 rounded-lg">
          Waiting for opponent's turn...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-xs text-gray-500 text-center py-6 bg-gray-800/30 rounded-lg">
          {isBanPhase
            ? 'Loading ban recommendations...'
            : 'Loading pick recommendations...'}
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.slice(0, 5).map((rec, idx) => (
            <RecommendationCard
              key={rec.champion}
              rec={rec}
              rank={idx + 1}
              isBanPhase={isBanPhase}
              isMyTurn={isMyTurn}
              onClick={() => onRecommendationClick(rec.champion)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Individual recommendation card with improved visuals
 */
function RecommendationCard({
  rec,
  rank,
  isBanPhase,
  isMyTurn,
  onClick,
}: {
  rec: {
    champion: string
    totalScore: number
    scores: {
      synergy: number
      counter: number
      composition: number
      side: number
      flex: number
    }
    confidence: string
    reasoning: string[]
  }
  rank: number
  isBanPhase: boolean
  isMyTurn: boolean
  onClick: () => void
}) {
  // Calculate predicted win rate from total score
  // totalScore is normalized around 0.5, with range ~0.3-0.7
  // Map to 40%-60% win rate for realistic display
  const predictedWinRate = Math.round(50 + (rec.totalScore - 0.5) * 40)
  const isTopPick = rank === 1

  // Calculate overall score as percentage for display
  const overallScore = Math.round(rec.totalScore * 100)

  return (
    <button
      onClick={onClick}
      disabled={!isMyTurn}
      className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 animate-fade-in ${
        isTopPick
          ? isBanPhase
            ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 shadow-lg shadow-red-500/10'
            : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
          : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
      } ${isMyTurn ? 'cursor-pointer hover-lift' : 'cursor-default opacity-70'}`}
      style={{ animationDelay: `${rank * 50}ms` }}
    >
      {/* Champion header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="relative">
          <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${isTopPick ? 'ring-2 ring-cyan-400/50' : ''}`}>
            <Image
              src={getChampionImageUrl(rec.champion)}
              alt={rec.champion}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          {isTopPick && (
            <div className={`absolute -top-1 -left-1 w-5 h-5 ${isBanPhase ? 'bg-red-500' : 'bg-cyan-500'} rounded-full flex items-center justify-center shadow-lg`}>
              <span className="text-[10px] font-bold text-white">#1</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{rec.champion}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                predictedWinRate >= 55
                  ? 'bg-green-500/20 text-green-400'
                  : predictedWinRate >= 50
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {predictedWinRate}% WR
            </span>
          </div>

          {/* Score breakdown with numbers */}
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {rec.scores.synergy > 0.2 && (
              <ScoreTag
                icon={<ZapIcon className="w-2.5 h-2.5" />}
                label={`+${Math.round(rec.scores.synergy * 100)}%`}
                tooltip="Synergy"
                color="purple"
              />
            )}
            {rec.scores.counter > 0.2 && (
              <ScoreTag
                icon={<SwordsIcon className="w-2.5 h-2.5" />}
                label={`+${Math.round(rec.scores.counter * 100)}%`}
                tooltip="Counter"
                color="red"
              />
            )}
            {rec.scores.composition > 0.2 && (
              <ScoreTag
                icon={<ShieldCheckIcon className="w-2.5 h-2.5" />}
                label={`+${Math.round(rec.scores.composition * 100)}%`}
                tooltip="Comp"
                color="blue"
              />
            )}
            {rec.scores.flex > 0.6 && (
              <ScoreTag
                icon={<TargetIcon className="w-2.5 h-2.5" />}
                label="Flex"
                tooltip="Multi-role"
                color="green"
              />
            )}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {rec.reasoning && rec.reasoning.length > 0 && (
        <div className="mt-2 space-y-1 pl-1 border-l-2 border-gray-700 ml-1">
          {rec.reasoning.slice(0, 2).map((reason, i) => (
            <div key={i} className="text-[10px] text-gray-400 pl-2 leading-relaxed">
              {reason}
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

/**
 * Score tag component with optional tooltip
 */
function ScoreTag({
  icon,
  label,
  tooltip,
  color,
}: {
  icon: React.ReactNode
  label: string
  tooltip?: string
  color: 'purple' | 'red' | 'blue' | 'green'
}) {
  const colors = {
    purple: 'bg-purple-500/20 text-purple-300',
    red: 'bg-red-500/20 text-red-300',
    blue: 'bg-blue-500/20 text-blue-300',
    green: 'bg-green-500/20 text-green-300',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[color]}`}
      title={tooltip}
    >
      {icon}
      {label}
    </span>
  )
}

/**
 * "How to Win" section for post-draft analysis
 */
function HowToWinSection({
  winPct,
  userPicks,
  opponentPicks,
}: {
  winPct: number
  userPicks: Array<{ champion: string }>
  opponentPicks: Array<{ champion: string }>
}) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <TrophyIcon className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          How to Win
        </span>
      </div>

      <div className="space-y-3">
        {/* Win condition summary */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <FlameIcon className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300">Win Condition</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {winPct >= 55
              ? 'Strong draft advantage! Play to your win conditions and control the tempo. Your composition has clear synergies.'
              : winPct >= 45
              ? 'Even match-up. Focus on executing your team\'s strengths and watch for opponent power spikes.'
              : 'Difficult draft. Look for picks on isolated targets and avoid 5v5 team fights until you\'ve scaled.'}
          </p>
        </div>

        {/* Strategic tips based on composition */}
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Key Strategies</div>

          <StrategyCard
            icon={<SwordsIcon className="w-3.5 h-3.5" />}
            title="Early Game"
            description="Prioritize first drake and establish vision control around objectives."
            color="blue"
          />

          <StrategyCard
            icon={<ShieldCheckIcon className="w-3.5 h-3.5" />}
            title="Mid Game"
            description="Group for objectives and use your composition's strengths in skirmishes."
            color="green"
          />

          <StrategyCard
            icon={<TrophyIcon className="w-3.5 h-3.5" />}
            title="Late Game"
            description="Focus on Baron control and look for clean engages in team fights."
            color="yellow"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Strategy card component
 */
function StrategyCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: 'blue' | 'green' | 'yellow'
}) {
  const colors = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
  }
  const style = colors[color]

  return (
    <div className={`p-2.5 rounded-lg border ${style.border} ${style.bg} animate-slide-in-left`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={style.text}>{icon}</span>
        <span className={`text-xs font-medium ${style.text}`}>{title}</span>
      </div>
      <p className="text-[10px] text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}
