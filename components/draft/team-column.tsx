'use client'

/**
 * Compact vertical team column showing bans and picks
 *
 * Displays team composition in a narrow vertical strip:
 * - Bans in groups (3 + 2)
 * - Picks with role badges (3 + 2)
 * - Current action slot highlighted
 */

import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'

interface TeamColumnProps {
  side: 'blue' | 'red'
  className?: string
}

// Role badge colors
const ROLE_COLORS: Record<string, string> = {
  top: 'bg-yellow-600',
  jungle: 'bg-green-600',
  mid: 'bg-blue-600',
  adc: 'bg-red-600',
  support: 'bg-cyan-600',
}

function ChampionSlot({
  champion,
  role,
  isEmpty,
  isCurrentAction,
  isBan,
  size = 'normal',
}: {
  champion?: string
  role?: string | null
  isEmpty: boolean
  isCurrentAction: boolean
  isBan: boolean
  size?: 'normal' | 'small'
}) {
  const sizeClass = size === 'small' ? 'w-10 h-10' : 'w-12 h-12'
  const iconSize = size === 'small' ? 32 : 40

  return (
    <div
      className={`
        ${sizeClass} rounded-lg overflow-hidden relative
        ${isEmpty ? 'bg-gray-800 border-2 border-dashed border-gray-600' : 'bg-gray-700'}
        ${isCurrentAction ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-900 animate-pulse' : ''}
        ${isBan && !isEmpty ? 'opacity-60' : ''}
      `}
    >
      {champion && (
        <>
          <Image
            src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champion}.png`}
            alt={champion}
            width={iconSize}
            height={iconSize}
            className={`w-full h-full object-cover ${isBan ? 'grayscale' : ''}`}
          />
          {isBan && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center" />
            </div>
          )}
          {role && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${ROLE_COLORS[role] || 'bg-gray-500'}
                          flex items-center justify-center text-[8px] font-bold text-white uppercase`}
            >
              {role.charAt(0)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function TeamColumn({ side, className = '' }: TeamColumnProps) {
  const bans = useDraftStore((state) => state[side].bans)
  const picks = useDraftStore((state) => state[side].picks)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const userSide = useDraftStore((state) => state.userSide)

  const turnInfo = getTurnInfo(currentTurn)
  const isCurrentSide = turnInfo?.side === side
  const isBanPhase = turnInfo?.action === 'ban'
  const isUserTeam = side === userSide

  // Calculate which slot is current
  const getCurrentBanIndex = () => {
    if (!isCurrentSide || !isBanPhase) return -1
    return bans.length
  }

  const getCurrentPickIndex = () => {
    if (!isCurrentSide || isBanPhase) return -1
    return picks.length
  }

  const currentBanIndex = getCurrentBanIndex()
  const currentPickIndex = getCurrentPickIndex()

  // Side color
  const sideColor = side === 'blue' ? 'text-blue-400' : 'text-red-400'
  const sideBorder = side === 'blue' ? 'border-blue-500/30' : 'border-red-500/30'

  return (
    <div
      className={`flex flex-col items-center gap-2 p-2 bg-gray-900/50 rounded-lg border ${sideBorder} ${className}`}
    >
      {/* Team label */}
      <div className={`text-xs font-bold uppercase ${sideColor}`}>
        {side === 'blue' ? 'Blue' : 'Red'}
        {isUserTeam && <span className="text-yellow-400 ml-1">★</span>}
      </div>

      {/* Ban Phase 1 (3 bans) */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <ChampionSlot
            key={`ban1-${i}`}
            champion={bans[i]}
            isEmpty={!bans[i]}
            isCurrentAction={currentBanIndex === i}
            isBan={true}
            size="small"
          />
        ))}
      </div>

      {/* Picks Phase 1 (3 picks) */}
      <div className="flex flex-col gap-1 mt-1">
        {[0, 1, 2].map((i) => (
          <ChampionSlot
            key={`pick1-${i}`}
            champion={picks[i]?.champion}
            role={picks[i]?.role}
            isEmpty={!picks[i]}
            isCurrentAction={currentPickIndex === i}
            isBan={false}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-gray-700 my-1" />

      {/* Ban Phase 2 (2 bans) */}
      <div className="flex gap-1">
        {[3, 4].map((i) => (
          <ChampionSlot
            key={`ban2-${i}`}
            champion={bans[i]}
            isEmpty={!bans[i]}
            isCurrentAction={currentBanIndex === i}
            isBan={true}
            size="small"
          />
        ))}
      </div>

      {/* Picks Phase 2 (2 picks) */}
      <div className="flex flex-col gap-1 mt-1">
        {[3, 4].map((i) => (
          <ChampionSlot
            key={`pick2-${i}`}
            champion={picks[i]?.champion}
            role={picks[i]?.role}
            isEmpty={!picks[i]}
            isCurrentAction={currentPickIndex === i}
            isBan={false}
          />
        ))}
      </div>
    </div>
  )
}
