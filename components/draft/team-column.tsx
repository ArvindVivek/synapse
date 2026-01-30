'use client'

/**
 * Enhanced team column showing bans, picks, and team composition stats
 *
 * Displays team composition in a vertical strip with:
 * - Bans in groups (3 + 2) with champion names
 * - Picks with role badges and champion names
 * - Current action slot highlighted
 * - Team composition insights (damage type, roles)
 */

import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'
import { getChampionImageUrl } from '@/lib/draft/champion-data'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'

interface TeamColumnProps {
  side: 'blue' | 'red'
  className?: string
}

// Role badge colors and icons
const ROLE_INFO: Record<string, { color: string; icon: string }> = {
  top: { color: 'bg-yellow-600', icon: '🗡️' },
  jungle: { color: 'bg-green-600', icon: '🌲' },
  mid: { color: 'bg-blue-600', icon: '⚡' },
  adc: { color: 'bg-red-600', icon: '🎯' },
  support: { color: 'bg-cyan-600', icon: '🛡️' },
}

function ChampionSlot({
  champion,
  role,
  isEmpty,
  isCurrentAction,
  isBan,
  showName = false,
}: {
  champion?: string
  role?: string | null
  isEmpty: boolean
  isCurrentAction: boolean
  isBan: boolean
  showName?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0
          ${isEmpty ? 'bg-gray-800 border border-dashed border-gray-600' : 'bg-gray-700'}
          ${isCurrentAction ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
          ${isBan && !isEmpty ? 'opacity-50' : ''}
        `}
      >
        {champion && (
          <>
            <Image
              src={getChampionImageUrl(champion)}
              alt={champion}
              width={40}
              height={40}
              className={`w-full h-full object-cover ${isBan ? 'grayscale' : ''}`}
            />
            {isBan && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-0.5 bg-red-500 rotate-45" />
              </div>
            )}
          </>
        )}
        {isEmpty && isCurrentAction && (
          <div className="absolute inset-0 flex items-center justify-center text-yellow-400 text-lg">
            ?
          </div>
        )}
      </div>

      {/* Champion name + role */}
      {showName && (
        <div className="flex-1 min-w-0">
          {champion ? (
            <div className="flex items-center gap-1">
              {role && (
                <span className="text-[10px]">{ROLE_INFO[role]?.icon || '•'}</span>
              )}
              <span className="text-xs text-white truncate">{champion}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              {isCurrentAction ? 'Picking...' : '—'}
            </span>
          )}
          {champion && !isBan && (
            <div className="text-[10px] text-gray-500 uppercase">
              {DAMAGE_TYPES[champion] || 'mixed'}
            </div>
          )}
        </div>
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
  const currentBanIndex = isCurrentSide && isBanPhase ? bans.length : -1
  const currentPickIndex = isCurrentSide && !isBanPhase ? picks.length : -1

  // Calculate team composition stats
  const damageBreakdown = picks.reduce(
    (acc, pick) => {
      if (!pick?.champion) return acc
      const type = DAMAGE_TYPES[pick.champion] || 'mixed'
      if (type === 'ap') acc.ap++
      else if (type === 'ad') acc.ad++
      else acc.mixed++
      return acc
    },
    { ap: 0, ad: 0, mixed: 0 }
  )

  // Side styling
  const sideColor = side === 'blue' ? 'text-blue-400' : 'text-red-400'
  const sideBg = side === 'blue' ? 'bg-blue-500/5' : 'bg-red-500/5'
  const sideBorder = side === 'blue' ? 'border-blue-500/20' : 'border-red-500/20'

  return (
    <div className={`flex flex-col bg-gray-900/80 border ${sideBorder} overflow-hidden ${className}`}>
      {/* Team header */}
      <div className={`px-3 py-2 ${sideBg} border-b ${sideBorder}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold uppercase ${sideColor}`}>
            {side}
          </span>
          {isUserTeam && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
              YOU
            </span>
          )}
        </div>
      </div>

      {/* Bans section */}
      <div className="px-2 py-2 border-b border-gray-800">
        <div className="text-[10px] font-semibold text-gray-500 mb-1.5">BANS</div>
        <div className="flex flex-wrap gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={`ban-${i}`}
              className={`w-7 h-7 rounded overflow-hidden ${
                bans[i] ? 'opacity-50' : 'bg-gray-800 border border-dashed border-gray-700'
              } ${currentBanIndex === i ? 'ring-1 ring-yellow-400 animate-pulse' : ''}`}
            >
              {bans[i] && (
                <Image
                  src={getChampionImageUrl(bans[i])}
                  alt={bans[i]}
                  width={28}
                  height={28}
                  className="w-full h-full object-cover grayscale"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Picks section */}
      <div className="flex-1 px-2 py-2 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 mb-1.5">PICKS</div>
        {[0, 1, 2, 3, 4].map((i) => (
          <ChampionSlot
            key={`pick-${i}`}
            champion={picks[i]?.champion}
            role={picks[i]?.role}
            isEmpty={!picks[i]}
            isCurrentAction={currentPickIndex === i}
            isBan={false}
            showName={true}
          />
        ))}
      </div>

      {/* Team composition summary */}
      {picks.length > 0 && (
        <div className={`px-2 py-2 ${sideBg} border-t ${sideBorder}`}>
          <div className="text-[10px] font-semibold text-gray-500 mb-1">DAMAGE</div>
          <div className="flex gap-1">
            {damageBreakdown.ap > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                AP: {damageBreakdown.ap}
              </span>
            )}
            {damageBreakdown.ad > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                AD: {damageBreakdown.ad}
              </span>
            )}
            {damageBreakdown.mixed > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded">
                Mix: {damageBreakdown.mixed}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
