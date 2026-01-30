'use client'

import { memo } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { FLEX_CHAMPIONS } from '@/lib/draft/champion-data'

interface ChampionCardProps {
  champion: string
  isBanPhase: boolean
}

function ChampionCardComponent({ champion, isBanPhase }: ChampionCardProps) {
  // Granular selectors to prevent unnecessary re-renders
  const canPick = useDraftStore((state) => state.canPick(champion))
  const canBan = useDraftStore((state) => state.canBan(champion))
  const executePick = useDraftStore((state) => state.executePick)
  const executeBan = useDraftStore((state) => state.executeBan)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())

  const isAvailable = isBanPhase ? canBan : canPick
  const isFlex = FLEX_CHAMPIONS.has(champion)

  const handleClick = () => {
    if (!isMyTurn) return
    if (isBanPhase && canBan) {
      executeBan(champion)
    } else if (!isBanPhase && canPick) {
      executePick(champion)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isAvailable || !isMyTurn}
      className={`
        relative aspect-square rounded-lg overflow-hidden
        transition-all duration-150
        ${isAvailable
          ? 'opacity-100 hover:scale-105 hover:ring-2 hover:ring-yellow-400'
          : 'opacity-30 grayscale'
        }
        ${isMyTurn && isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isFlex && isAvailable ? 'ring-2 ring-amber-500' : ''}
        bg-gray-700
      `}
      title={champion}
    >
      {/* Champion placeholder - colored square with initial */}
      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-300">
        {champion.charAt(0)}
      </div>

      {/* Champion name */}
      <div className="absolute bottom-0 w-full bg-black/80 text-white text-xs py-1 px-1 text-center truncate">
        {champion}
      </div>

      {/* Flex indicator badge */}
      {isFlex && isAvailable && (
        <div className="absolute top-1 right-1 bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
          FLEX
        </div>
      )}
    </button>
  )
}

// CRITICAL: Memoize to prevent re-renders of all 160+ cards on state change
export default memo(ChampionCardComponent)
