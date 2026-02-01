'use client'

/**
 * Bottom action bar with confirm button and AI suggestions
 *
 * Two-step flow: Select champion → Click action button to confirm
 * Enhanced with animations and visual polish
 */

import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'
import { useWinRate } from '@/lib/hooks/use-winrate'
import { useRecommendations } from '@/lib/hooks/use-recommendations'
import { getChampionImageUrl } from '@/lib/draft/champion-data'
import { SparklesIcon, BrainIcon, CrosshairIcon } from '@/components/ui/icons'

interface ActionBarProps {
  draftId: string
}

export function ActionBar({ draftId }: ActionBarProps) {
  const selectedChampion = useDraftStore((state) => state.selectedChampion)
  const confirmAction = useDraftStore((state) => state.confirmAction)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const userSide = useDraftStore((state) => state.userSide)
  const isComplete = useDraftStore((state) => state.isComplete)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())

  const turnInfo = getTurnInfo(currentTurn)
  const isBanPhase = turnInfo?.action === 'ban'

  // Get win rate
  const { userWinRate } = useWinRate()
  const winPct = Math.round(userWinRate * 100)

  // Get AI suggestion
  const { data: recsData, loading: recsLoading } = useRecommendations()
  const topRec = recsData?.recommendations?.[0]

  const handleConfirm = () => {
    if (selectedChampion) {
      confirmAction()
    }
  }

  // Win rate color and styling
  const getWinRateStyle = () => {
    if (winPct >= 55) return { color: 'text-green-400', bg: 'bg-green-500', glow: 'shadow-green-500/30' }
    if (winPct >= 45) return { color: 'text-yellow-400', bg: 'bg-yellow-500', glow: 'shadow-yellow-500/30' }
    return { color: 'text-red-400', bg: 'bg-red-500', glow: 'shadow-red-500/30' }
  }
  const winStyle = getWinRateStyle()

  if (isComplete) {
    return (
      <div className="bg-gradient-to-t from-gray-900 to-gray-900/95 border-t border-gray-800 px-4 py-4">
        <div className="flex items-center justify-center gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-green-400 animate-stat-glow" />
            <span className="text-green-400 font-bold text-lg">Draft Complete!</span>
          </div>
          <a
            href="/draft/new"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium
                       transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
          >
            New Draft
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-t from-gray-900 to-gray-900/95 border-t border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Selected champion preview or pulsating prompt */}
        <div className="flex items-center gap-3 w-64">
          {selectedChampion ? (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="relative">
                <div className="w-14 h-14 rounded-lg overflow-hidden ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20">
                  <Image
                    src={getChampionImageUrl(selectedChampion)}
                    alt={selectedChampion}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-black">✓</span>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold text-lg">{selectedChampion}</div>
                <div className="text-xs text-yellow-400/80">Ready to {isBanPhase ? 'ban' : 'lock in'}</div>
              </div>
            </div>
          ) : isMyTurn ? (
            <div className="flex items-center gap-3 animate-pulse-glow">
              <div className="relative">
                <div className="w-14 h-14 rounded-lg bg-gray-800 border-2 border-dashed border-blue-400/50
                               flex items-center justify-center animate-pulse-ring">
                  <CrosshairIcon className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div>
                <div className="text-blue-400 font-semibold animate-pulse-glow">
                  Select a champion...
                </div>
                <div className="text-xs text-gray-500">
                  Click on the grid above
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-14 h-14 rounded-lg bg-gray-800/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
              </div>
              <div>
                <div className="text-gray-400 font-medium">Opponent picking...</div>
                <div className="text-xs text-gray-600">Please wait</div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Action button */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selectedChampion || !isMyTurn}
            className={`
              relative px-10 py-3.5 rounded-lg font-bold text-lg uppercase tracking-wider
              transition-all duration-200 overflow-hidden
              ${selectedChampion && isMyTurn
                ? isBanPhase
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/30 hover:scale-105'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/30 hover:scale-105'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }
            `}
          >
            {selectedChampion && isMyTurn && (
              <div className="absolute inset-0 animate-shimmer opacity-30" />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {isBanPhase ? (
                <>
                  <span className="text-xl">✕</span>
                  BAN {selectedChampion && selectedChampion}
                </>
              ) : (
                <>
                  <span className="text-xl">⚔</span>
                  LOCK IN {selectedChampion && selectedChampion}
                </>
              )}
            </span>
          </button>
        </div>

        {/* Right: Win rate gauge and AI suggestion */}
        <div className="w-64 flex flex-col items-end gap-2">
          {/* Win rate display */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Predicted Win Rate</div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${winStyle.bg} transition-all duration-500 animate-progress-fill`}
                    style={{ width: `${winPct}%` }}
                  />
                </div>
                <span className={`font-bold text-lg ${winStyle.color}`}>{winPct}%</span>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full shadow-lg ${
                userSide === 'blue' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-red-500 shadow-red-500/50'
              }`}
            />
          </div>

          {/* AI suggestion */}
          {!recsLoading && topRec && isMyTurn && (
            <div className="flex items-center gap-2 text-xs bg-gray-800/50 rounded-lg px-3 py-1.5
                           border border-gray-700/50 animate-fade-in max-w-full">
              <BrainIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-gray-400">AI:</span>
              <span className="text-cyan-300 font-medium">{topRec.champion}</span>
              {topRec.reasoning?.[0] && (
                <span className="text-gray-500 truncate">- {topRec.reasoning[0]}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
