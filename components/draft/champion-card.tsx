'use client'

import { memo } from 'react'
import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { FLEX_CHAMPIONS, getChampionImageUrl } from '@/lib/draft/champion-data'

interface ChampionCardProps {
  champion: string
  isBanPhase: boolean
}

function ChampionCardComponent({ champion, isBanPhase }: ChampionCardProps) {
  // Granular selectors to prevent unnecessary re-renders
  const canPick = useDraftStore((state) => state.canPick(champion))
  const canBan = useDraftStore((state) => state.canBan(champion))
  const selectedChampion = useDraftStore((state) => state.selectedChampion)
  const selectChampion = useDraftStore((state) => state.selectChampion)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())

  const isAvailable = isBanPhase ? canBan : canPick
  const isFlex = FLEX_CHAMPIONS.has(champion)
  const isSelected = selectedChampion === champion

  const handleClick = () => {
    if (!isMyTurn || !isAvailable) return
    // Two-step flow: select (or deselect if already selected)
    selectChampion(isSelected ? null : champion)
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isAvailable || !isMyTurn}
      className={`
        relative w-16 h-16 rounded-lg overflow-hidden
        transition-all duration-150
        ${isAvailable
          ? 'opacity-100 hover:scale-105'
          : 'opacity-30 grayscale'
        }
        ${isMyTurn && isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected ? 'ring-2 ring-yellow-400 scale-105' : ''}
        ${isFlex && isAvailable && !isSelected ? 'ring-1 ring-amber-500' : ''}
        bg-gray-700
      `}
      title={champion}
    >
      {/* Champion image */}
      <Image
        src={getChampionImageUrl(champion)}
        alt={champion}
        width={64}
        height={64}
        className="w-full h-full object-cover"
      />

      {/* Champion name overlay */}
      <div className="absolute bottom-0 w-full bg-black/70 text-white text-[10px] py-0.5 text-center truncate">
        {champion}
      </div>

      {/* Flex indicator badge */}
      {isFlex && isAvailable && !isSelected && (
        <div className="absolute top-0.5 right-0.5 bg-amber-500 text-black text-[8px] px-1 py-0.5 rounded font-bold">
          F
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-0.5 left-0.5 bg-yellow-400 text-black text-[8px] px-1 py-0.5 rounded font-bold">
          ✓
        </div>
      )}

      {/* Unavailable X */}
      {!isAvailable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-0.5 bg-red-500/70 rotate-45" />
          <div className="w-10 h-0.5 bg-red-500/70 -rotate-45 absolute" />
        </div>
      )}
    </button>
  )
}

// CRITICAL: Memoize to prevent re-renders of all 160+ cards on state change
export default memo(ChampionCardComponent)
