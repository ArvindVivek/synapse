'use client'

/**
 * Bottom action bar with confirm button and AI suggestions
 *
 * Two-step flow: Select champion → Click action button to confirm
 */

import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'
import { useWinRate } from '@/lib/hooks/use-winrate'
import { useRecommendations } from '@/lib/hooks/use-recommendations'

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

  // Win rate color
  const winRateColor =
    winPct >= 55 ? 'text-green-400' :
    winPct >= 45 ? 'text-yellow-400' :
    'text-red-400'

  if (isComplete) {
    return (
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-3">
        <div className="flex items-center justify-center gap-4">
          <span className="text-green-400 font-bold text-lg">Draft Complete!</span>
          <a
            href="/draft/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            New Draft
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Selected champion preview */}
        <div className="flex items-center gap-3 w-48">
          {selectedChampion ? (
            <>
              <div className="w-12 h-12 rounded-lg overflow-hidden ring-2 ring-yellow-400">
                <Image
                  src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${selectedChampion}.png`}
                  alt={selectedChampion}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-white font-semibold">{selectedChampion}</div>
                <div className="text-xs text-gray-400">Selected</div>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">
              {isMyTurn ? 'Select a champion...' : 'Waiting for opponent...'}
            </div>
          )}
        </div>

        {/* Center: Action button */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selectedChampion || !isMyTurn}
            className={`
              px-8 py-3 rounded-lg font-bold text-lg uppercase tracking-wide
              transition-all duration-150
              ${selectedChampion && isMyTurn
                ? isBanPhase
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isBanPhase ? 'BAN' : 'LOCK IN'}
            {selectedChampion && ` ${selectedChampion}`}
          </button>
        </div>

        {/* Right: Win rate and AI suggestion */}
        <div className="w-56 flex flex-col items-end gap-1">
          {/* Win rate */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Win Rate:</span>
            <span className={`font-bold ${winRateColor}`}>{winPct}%</span>
            <div
              className={`w-3 h-3 rounded-full ${
                userSide === 'blue' ? 'bg-blue-500' : 'bg-red-500'
              }`}
            />
          </div>

          {/* AI suggestion */}
          {!recsLoading && topRec && isMyTurn && (
            <div className="text-xs text-gray-400 truncate max-w-full">
              AI suggests: <span className="text-white">{topRec.champion}</span>
              {topRec.reasoning?.[0] && (
                <span className="text-gray-500"> - {topRec.reasoning[0]}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
