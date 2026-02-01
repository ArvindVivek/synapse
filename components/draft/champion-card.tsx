'use client'

import { memo } from 'react'
import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { FLEX_CHAMPIONS, getChampionImageUrl } from '@/lib/draft/champion-data'
import { useHighlights } from '@/lib/contexts/highlight-context'
import { StarIcon, AlertTriangleIcon } from '@/components/ui/icons'

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

  // Get highlight state
  const { getHighlight } = useHighlights()
  const highlight = getHighlight(champion)

  const isAvailable = isBanPhase ? canBan : canPick
  const isFlex = FLEX_CHAMPIONS.has(champion)
  const isSelected = selectedChampion === champion

  const handleClick = () => {
    if (!isMyTurn || !isAvailable) return
    // Two-step flow: select (or deselect if already selected)
    selectChampion(isSelected ? null : champion)
  }

  // Check if this is the #1 pick (score >= 0.9)
  const isTopPick = highlight && highlight.score && highlight.score >= 0.9

  // Determine highlight styling
  const getHighlightStyles = () => {
    if (!highlight || !isAvailable) return { ring: '', glow: '', badge: null, scale: '', extra: '' }

    switch (highlight.type) {
      case 'recommendation':
        // #1 pick gets MASSIVE visual treatment
        if (isTopPick) {
          return {
            ring: 'ring-4 ring-cyan-400 animate-pulse-ring',
            glow: 'shadow-2xl shadow-cyan-400/60',
            scale: 'scale-[1.35] z-20',
            extra: '',
            badge: (
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center animate-bounce-subtle z-30 shadow-xl shadow-cyan-500/60 ring-2 ring-white/60">
                <span className="text-white font-black text-sm">#1</span>
              </div>
            ),
          }
        }
        return {
          ring: 'ring-2 ring-cyan-400 animate-pulse-ring',
          glow: 'shadow-lg shadow-cyan-500/30',
          scale: '',
          extra: '',
          badge: (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center animate-bounce-subtle z-10">
              <StarIcon className="w-3 h-3 text-white" />
            </div>
          ),
        }
      case 'priority-ban':
        // #1 priority ban gets massive treatment
        if (isTopPick) {
          return {
            ring: 'ring-4 ring-red-400 animate-pulse-ring',
            glow: 'shadow-2xl shadow-red-400/60',
            scale: 'scale-[1.35] z-20',
            extra: '',
            badge: (
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center animate-bounce-subtle z-30 shadow-xl shadow-red-500/60 ring-2 ring-white/60">
                <AlertTriangleIcon className="w-5 h-5 text-white" />
              </div>
            ),
          }
        }
        return {
          ring: 'ring-2 ring-red-400 animate-pulse-ring',
          glow: 'shadow-lg shadow-red-500/30',
          scale: '',
          extra: '',
          badge: (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-bounce-subtle z-10">
              <AlertTriangleIcon className="w-3 h-3 text-white" />
            </div>
          ),
        }
      case 'synergy':
        return {
          ring: 'ring-2 ring-purple-400',
          glow: 'shadow-md shadow-purple-500/20',
          scale: '',
          extra: '',
          badge: null,
        }
      case 'counter':
        return {
          ring: 'ring-2 ring-orange-400',
          glow: 'shadow-md shadow-orange-500/20',
          scale: '',
          extra: '',
          badge: null,
        }
      default:
        return { ring: '', glow: '', badge: null, scale: '', extra: '' }
    }
  }

  const highlightStyles = getHighlightStyles()

  return (
    <button
      onClick={handleClick}
      disabled={!isAvailable || !isMyTurn}
      className={`
        relative w-16 h-16 rounded-lg overflow-visible
        transition-all duration-200
        ${isAvailable
          ? 'opacity-100 hover:scale-105'
          : 'opacity-30 grayscale'
        }
        ${isMyTurn && isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${isSelected
          ? 'ring-2 ring-yellow-400 scale-105 shadow-lg shadow-yellow-400/30'
          : highlight && isAvailable
            ? `${highlightStyles.ring} ${highlightStyles.glow} ${highlightStyles.scale} ${highlightStyles.extra}`
            : isFlex && isAvailable
              ? 'ring-1 ring-amber-500/50'
              : ''
        }
        bg-gray-700
      `}
      title={champion}
    >
      {/* Highlight badge */}
      {!isSelected && highlightStyles.badge}

      {/* Champion image container with overflow hidden */}
      <div className="w-full h-full rounded-lg overflow-hidden">
        <Image
          src={getChampionImageUrl(champion)}
          alt={champion}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Champion name overlay */}
      <div className={`absolute bottom-0 left-0 right-0 rounded-b-lg text-white py-0.5 text-center truncate
        ${isTopPick && isAvailable && !isSelected
          ? highlight?.type === 'recommendation'
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-[11px] font-bold py-1'
            : highlight?.type === 'priority-ban'
              ? 'bg-gradient-to-r from-red-600 to-orange-600 text-[11px] font-bold py-1'
              : 'bg-black/70 text-[10px]'
          : highlight && isAvailable && !isSelected
            ? highlight.type === 'recommendation'
              ? 'bg-cyan-900/90 text-[10px]'
              : highlight.type === 'priority-ban'
                ? 'bg-red-900/90 text-[10px]'
                : 'bg-black/70 text-[10px]'
            : 'bg-black/70 text-[10px]'
        }
      `}>
        {champion}
      </div>

      {/* Flex indicator badge - only show if not highlighted and not selected */}
      {isFlex && isAvailable && !isSelected && !highlight && (
        <div className="absolute top-0.5 right-0.5 bg-amber-500 text-black text-[8px] px-1 py-0.5 rounded font-bold z-10">
          F
        </div>
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-0.5 left-0.5 bg-yellow-400 text-black text-[8px] px-1 py-0.5 rounded font-bold z-10">
          ✓
        </div>
      )}

      {/* Unavailable X */}
      {!isAvailable && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg">
          <div className="w-10 h-0.5 bg-red-500/70 rotate-45" />
          <div className="w-10 h-0.5 bg-red-500/70 -rotate-45 absolute" />
        </div>
      )}
    </button>
  )
}

// CRITICAL: Memoize to prevent re-renders of all 160+ cards on state change
export default memo(ChampionCardComponent)
