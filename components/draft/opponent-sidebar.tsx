'use client'

/**
 * Opponent Scouting Sidebar
 *
 * Shows all players on the opponent team with their champion pools visible.
 * Each player card shows:
 * - Role icon and player name
 * - Top 3 signature/comfort champions with win rates
 * - Click to expand for full champion pool
 */

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useDraftStore } from '@/lib/draft/store'
import { useTeams, type Team, type TeamPlayer } from '@/lib/hooks/use-teams'
import { useTeamPools, type TeamPlayerPool } from '@/lib/hooks/use-team-pools'
import { getChampionImageUrl } from '@/lib/draft/champion-data'
import { getTurnInfo } from '@/lib/draft/sequence'
import {
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TargetIcon,
  StarIcon,
  AlertTriangleIcon,
} from '@/components/ui/icons'

type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  top: TopIcon,
  jungle: JungleIcon,
  mid: MidIcon,
  adc: AdcIcon,
  support: SupportIcon,
}

const ROLE_ORDER: Role[] = ['top', 'jungle', 'mid', 'adc', 'support']

const ROLE_COLORS: Record<Role, string> = {
  top: 'text-yellow-400',
  jungle: 'text-green-400',
  mid: 'text-blue-400',
  adc: 'text-red-400',
  support: 'text-cyan-400',
}

const ROLE_BG: Record<Role, string> = {
  top: 'from-yellow-500/10 to-yellow-500/5',
  jungle: 'from-green-500/10 to-green-500/5',
  mid: 'from-blue-500/10 to-blue-500/5',
  adc: 'from-red-500/10 to-red-500/5',
  support: 'from-cyan-500/10 to-cyan-500/5',
}

interface OpponentSidebarProps {
  className?: string
}

export function OpponentSidebar({ className = '' }: OpponentSidebarProps) {
  const [manualTeam, setManualTeam] = useState<Team | null>(null)
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)

  const { teams, loading: teamsLoading } = useTeams()
  const userSide = useDraftStore((state) => state.userSide)
  const opponentTeam = useDraftStore((state) => state.opponentTeam)
  const selectChampion = useDraftStore((state) => state.selectChampion)
  const isMyTurn = useDraftStore((state) => state.isMyTurn())
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const opponentSide = userSide === 'blue' ? 'RED' : 'BLUE'

  // Use store opponent team if available, otherwise use manual selection
  const selectedTeam: Team | null = opponentTeam
    ? {
        id: opponentTeam.id,
        name: opponentTeam.name,
        players: opponentTeam.players,
      }
    : manualTeam

  const turnInfo = getTurnInfo(currentTurn)
  const isBanPhase = turnInfo?.action === 'ban'

  // Get players sorted by role
  const sortedPlayers = useMemo(() => {
    if (!selectedTeam) return []
    return ROLE_ORDER.map((role) =>
      selectedTeam.players.find((p) => p.role === role)
    ).filter((p): p is TeamPlayer => p !== undefined)
  }, [selectedTeam])

  // Fetch all player pools at once
  const playersInput = useMemo(
    () =>
      sortedPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      })),
    [sortedPlayers]
  )
  const { pools, loading: poolsLoading } = useTeamPools(playersInput)

  const handleTeamSelect = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId)
    setManualTeam(team || null)
    setExpandedPlayerId(null)
  }

  const handlePlayerToggle = (playerId: string) => {
    setExpandedPlayerId((prev) => (prev === playerId ? null : playerId))
  }

  const handleChampionClick = (champion: string) => {
    if (!isMyTurn) return
    selectChampion(champion)
  }

  // Get all priority bans across all players (signature picks with high WR)
  const allPriorityBans = useMemo(() => {
    const bans: Array<{
      champion: string
      playerName: string
      role: string
      winRate: number
    }> = []

    pools.forEach((pool) => {
      pool.signatureChamps.forEach((champ) => {
        if (champ.winRate >= 0.55) {
          bans.push({
            champion: champ.champion,
            playerName: pool.playerName,
            role: pool.role,
            winRate: champ.winRate,
          })
        }
      })
    })

    return bans.sort((a, b) => b.winRate - a.winRate).slice(0, 5)
  }, [pools])

  return (
    <div
      className={`flex flex-col bg-gradient-to-b from-gray-900/95 to-gray-900 border-r border-gray-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-b border-red-500/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TargetIcon className="w-4 h-4 text-red-400" />
          <h3 className="text-xs font-bold text-white tracking-wide">
            OPPONENT SCOUTING
          </h3>
        </div>
        <p className="text-[10px] text-red-400/70 mt-0.5">
          {opponentSide} Team Analysis
        </p>
      </div>

      {/* Team Selector - only show if no team from store */}
      {!opponentTeam && (
        <div className="p-2 border-b border-gray-800 flex-shrink-0">
          <select
            value={manualTeam?.id || ''}
            onChange={(e) => handleTeamSelect(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white text-xs rounded-lg
                       border border-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500
                       cursor-pointer transition-colors hover:border-gray-600"
          >
            <option value="">Select opponent team...</option>
            {teamsLoading ? (
              <option disabled>Loading teams...</option>
            ) : (
              teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.players.length} players)
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {/* Team Name Banner */}
      {selectedTeam && (
        <div className="px-3 py-2 border-b border-gray-800 bg-gray-800/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersIcon className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-white">
                {selectedTeam.name}
              </span>
            </div>
            {poolsLoading && (
              <div className="w-3 h-3 border border-red-500/30 border-t-red-400 rounded-full animate-spin" />
            )}
          </div>
        </div>
      )}

      {/* Priority Bans Summary - only show if we have data */}
      {allPriorityBans.length > 0 && isBanPhase && (
        <div className="px-3 py-2 border-b border-gray-800 bg-red-500/5 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
              Top Priority Bans
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allPriorityBans.slice(0, 4).map((ban) => (
              <button
                key={`${ban.playerName}-${ban.champion}`}
                onClick={() => handleChampionClick(ban.champion)}
                disabled={!isMyTurn}
                className={`relative group ${isMyTurn ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div
                  className={`w-9 h-9 rounded-lg overflow-hidden ring-2 ring-red-500/50
                              ${isMyTurn ? 'hover:ring-red-400 hover:scale-105 transition-transform' : ''}`}
                >
                  <Image
                    src={getChampionImageUrl(ban.champion)}
                    alt={ban.champion}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Tooltip */}
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 rounded text-[9px] text-white
                              opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10
                              border border-gray-700 shadow-lg"
                >
                  <span className="text-gray-400">{ban.playerName}&apos;s</span>{' '}
                  {ban.champion}
                  <span className="text-green-400 ml-1">
                    {Math.round(ban.winRate * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Players with Champion Pools */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTeam ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center h-full">
            <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-3">
              <TargetIcon className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-xs text-gray-400 font-medium mb-1">
              No Team Selected
            </p>
            <p className="text-[10px] text-gray-500 max-w-[140px]">
              Select an opponent team above to view their scouting report
            </p>
          </div>
        ) : sortedPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center h-full">
            <UsersIcon className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">No player data available</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sortedPlayers.map((player) => {
              const pool = pools.get(player.id)
              const isExpanded = expandedPlayerId === player.id
              const RoleIcon = ROLE_ICONS[player.role]
              const roleColor = ROLE_COLORS[player.role]
              const roleBg = ROLE_BG[player.role]

              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  pool={pool}
                  isExpanded={isExpanded}
                  isLoading={poolsLoading && !pool}
                  isMyTurn={isMyTurn}
                  RoleIcon={RoleIcon}
                  roleColor={roleColor}
                  roleBg={roleBg}
                  onToggle={() => handlePlayerToggle(player.id)}
                  onChampionClick={handleChampionClick}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Player card showing champion pool
 */
function PlayerCard({
  player,
  pool,
  isExpanded,
  isLoading,
  isMyTurn,
  RoleIcon,
  roleColor,
  roleBg,
  onToggle,
  onChampionClick,
}: {
  player: TeamPlayer
  pool: TeamPlayerPool | undefined
  isExpanded: boolean
  isLoading: boolean
  isMyTurn: boolean
  RoleIcon: React.ComponentType<{ className?: string }>
  roleColor: string
  roleBg: string
  onToggle: () => void
  onChampionClick: (champion: string) => void
}) {
  // Get display champions - show signature first, then top by winrate
  const displayChamps = useMemo(() => {
    if (!pool || pool.championPool.length === 0) return []

    // Prioritize signature picks, then sort by win rate
    const sorted = [...pool.championPool].sort((a, b) => {
      if (a.comfortLevel === 'signature' && b.comfortLevel !== 'signature')
        return -1
      if (b.comfortLevel === 'signature' && a.comfortLevel !== 'signature')
        return 1
      return b.winRate - a.winRate
    })

    return isExpanded ? sorted.slice(0, 8) : sorted.slice(0, 3)
  }, [pool, isExpanded])

  const hasData = pool && pool.championPool.length > 0

  return (
    <div
      className={`rounded-lg border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'border-gray-600 bg-gray-800/50'
          : 'border-gray-800 bg-gray-800/30 hover:border-gray-700'
      }`}
    >
      {/* Player Header - always visible */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 p-2.5 text-left transition-colors bg-gradient-to-r ${roleBg}`}
      >
        {/* Role icon */}
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center bg-gray-800/50 ${roleColor}`}
        >
          <RoleIcon className="w-4 h-4" />
        </div>

        {/* Player name and stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white truncate">
              {player.name}
            </span>
            {hasData && (
              <span className="text-[9px] text-gray-500">
                {Math.round((pool?.avgWinRate || 0) * 100)}% avg WR
              </span>
            )}
          </div>
        </div>

        {/* Loading / Expand indicator */}
        {isLoading ? (
          <div className="w-4 h-4 border border-gray-600 border-t-gray-400 rounded-full animate-spin" />
        ) : (
          <div className="text-gray-500">
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </div>
        )}
      </button>

      {/* Champion Pool - always show top 3, expand for more */}
      {hasData && (
        <div className="px-2 pb-2">
          {/* Champion icons row */}
          <div
            className={`flex flex-wrap gap-1.5 ${isExpanded ? 'pt-2' : 'pt-1.5'}`}
          >
            {displayChamps.map((champ) => (
              <ChampionBadge
                key={champ.champion}
                champ={champ}
                isClickable={isMyTurn}
                showDetails={isExpanded}
                onClick={() => onChampionClick(champ.champion)}
              />
            ))}
          </div>

          {/* Show more indicator when collapsed */}
          {!isExpanded && pool && pool.championPool.length > 3 && (
            <div className="text-[9px] text-gray-500 mt-1.5 text-center">
              +{pool.championPool.length - 3} more champions
            </div>
          )}

          {/* Expanded view: full stats */}
          {isExpanded && pool && (
            <div className="mt-3 pt-2 border-t border-gray-700/50">
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>
                  {pool.signatureChamps.length} signature picks
                </span>
                <span>{pool.totalGames} total games</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No data state */}
      {!isLoading && !hasData && (
        <div className="px-2 pb-2 pt-1">
          <p className="text-[10px] text-gray-600 text-center">
            No champion data
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Champion badge with win rate
 */
function ChampionBadge({
  champ,
  isClickable,
  showDetails,
  onClick,
}: {
  champ: {
    champion: string
    winRate: number
    comfortLevel: string
    gamesPlayed: number
  }
  isClickable: boolean
  showDetails: boolean
  onClick: () => void
}) {
  const wrPct = Math.round(champ.winRate * 100)
  const isSignature = champ.comfortLevel === 'signature'

  if (showDetails) {
    // Expanded view: show full row with details
    return (
      <button
        onClick={onClick}
        disabled={!isClickable}
        className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-all ${
          isSignature
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
        } ${isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}`}
      >
        {/* Champion icon */}
        <div className="relative w-8 h-8 rounded overflow-hidden flex-shrink-0">
          <Image
            src={getChampionImageUrl(champ.champion)}
            alt={champ.champion}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
          {isSignature && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
              <StarIcon className="w-2 h-2 text-yellow-900" />
            </div>
          )}
        </div>

        {/* Name and stats */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-white truncate block">
            {champ.champion}
          </span>
          <div className="flex items-center gap-2 text-[9px]">
            <span
              className={
                wrPct >= 60
                  ? 'text-green-400'
                  : wrPct >= 50
                    ? 'text-blue-400'
                    : 'text-red-400'
              }
            >
              {wrPct}% WR
            </span>
            <span className="text-gray-500">{champ.gamesPlayed} games</span>
          </div>
        </div>
      </button>
    )
  }

  // Compact view: just icon with tooltip
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`relative group ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div
        className={`w-8 h-8 rounded-lg overflow-hidden transition-transform ${
          isSignature ? 'ring-2 ring-yellow-500/50' : 'ring-1 ring-gray-700'
        } ${isClickable ? 'hover:scale-110' : ''}`}
      >
        <Image
          src={getChampionImageUrl(champ.champion)}
          alt={champ.champion}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
      {isSignature && (
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center">
          <StarIcon className="w-2 h-2 text-yellow-900" />
        </div>
      )}
      {/* Win rate indicator */}
      <div
        className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 rounded ${
          wrPct >= 60
            ? 'bg-green-500/80 text-white'
            : wrPct >= 50
              ? 'bg-blue-500/80 text-white'
              : 'bg-gray-700/80 text-gray-300'
        }`}
      >
        {wrPct}%
      </div>
      {/* Tooltip */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-[9px] text-white
                    opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10
                    border border-gray-700 shadow-lg"
      >
        {champ.champion}
        {isSignature && (
          <span className="text-yellow-400 ml-1">(signature)</span>
        )}
        {isClickable && <span className="text-gray-400 ml-1">• click to select</span>}
      </div>
    </button>
  )
}
