'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { nanoid } from 'nanoid'
import { useDraftStore } from '@/lib/draft/store'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'
import { useTeams, Team } from '@/lib/hooks/use-teams'
import { DraftFormat } from '@/lib/draft/types'
import { getTeamIconUrl, getTeamAbbreviation } from '@/lib/teams/team-icons'
import {
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
} from '@/components/ui/icons'

const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

const DRAFT_FORMATS: { value: DraftFormat; label: string; description: string }[] = [
  { value: 'tournament', label: 'Tournament', description: 'Standard pro draft (5 bans, 5 picks)' },
  { value: 'fearless', label: 'Fearless', description: 'Champions can only be picked once per series' },
  { value: 'scrim', label: 'Scrim', description: 'Practice mode with relaxed rules' },
]

// Fixed role order for consistent display
const ROLE_ORDER = ['top', 'jungle', 'mid', 'adc', 'support'] as const

export default function Home() {
  const [selectedSide, setSelectedSide] = useState<'blue' | 'red'>('blue')
  const [selectedFormat, setSelectedFormat] = useState<DraftFormat>('tournament')
  const [isNavigating, setIsNavigating] = useState(false)
  const { teams, loading, error } = useTeams()
  const router = useRouter()
  const initializeDraft = useDraftStore((state) => state.initializeDraft)

  const handleSelectTeam = async (team: Team) => {
    if (isNavigating) return
    setIsNavigating(true)

    const draftId = nanoid(12)

    // Initialize the draft store with team and format
    initializeDraft({
      id: draftId,
      userSide: selectedSide,
      allChampions: ALL_CHAMPIONS,
      format: selectedFormat,
      opponentTeam: {
        id: team.id,
        name: team.name,
        players: team.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role as 'top' | 'jungle' | 'mid' | 'adc' | 'support',
        })),
      },
    })

    // Navigate to draft
    router.push(`/draft/${draftId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl blur-xl opacity-50 animate-pulse" />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden bg-white/5">
                <Image src="/c9.png" alt="Cloud9" width={48} height={48} className="object-contain" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
              SYNAPSE
            </h1>
          </div>
          <p className="text-lg text-gray-400 font-light">
            AI-Powered Draft Assistant for League of Legends
          </p>
        </header>

        {/* Draft Setup Row */}
        <section className="mb-10">
          <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              {/* Side Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3 text-center">Your Side</h3>
                <div className="flex gap-3">
                  <SideButton
                    side="blue"
                    selected={selectedSide === 'blue'}
                    onClick={() => setSelectedSide('blue')}
                  />
                  <SideButton
                    side="red"
                    selected={selectedSide === 'red'}
                    onClick={() => setSelectedSide('red')}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-20 bg-gray-700" />

              {/* Format Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3 text-center">Draft Format</h3>
                <div className="flex gap-2">
                  {DRAFT_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedFormat === format.value
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title={format.description}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {DRAFT_FORMATS.find(f => f.value === selectedFormat)?.description}
                </p>
              </div>
            </div>

            {/* Side Info */}
            <div className="text-center mt-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                selectedSide === 'blue'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                <TeamIcon className="w-4 h-4" />
                <span>
                  {selectedSide === 'blue'
                    ? 'Blue side bans first and gets first pick'
                    : 'Red side gets counter-pick advantage'
                  }
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Team Selection */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Select Opponent Team</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <LoadingSpinner />
                <span className="text-gray-400">Loading teams...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-400 mb-2">Failed to load teams</p>
              <p className="text-gray-500 text-sm">Please check your connection and try again</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onClick={() => handleSelectTeam(team)}
                  disabled={isNavigating}
                />
              ))}
            </div>
          )}
        </section>

        {/* Role Icons Footer */}
        <footer className="mt-16 text-center">
          <div className="flex items-center justify-center gap-6 mb-4">
            <TopIcon className="w-5 h-5 text-yellow-400/60" />
            <JungleIcon className="w-5 h-5 text-green-400/60" />
            <MidIcon className="w-5 h-5 text-blue-400/60" />
            <AdcIcon className="w-5 h-5 text-red-400/60" />
            <SupportIcon className="w-5 h-5 text-cyan-400/60" />
          </div>
          <p className="text-gray-600 text-sm">
            Powered by professional match data
          </p>
        </footer>
      </div>
    </div>
  )
}

function TeamCard({
  team,
  onClick,
  disabled,
}: {
  team: Team
  onClick: () => void
  disabled: boolean
}) {
  const iconUrl = getTeamIconUrl(team.name)
  const abbreviation = getTeamAbbreviation(team.name)

  // Sort players by role order and pad to 5 slots for symmetry
  const sortedPlayers = ROLE_ORDER.map(role => {
    const player = team.players.find(p => p.role === role)
    return player ? player.name : null
  })

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative bg-gray-900/80 hover:bg-gray-800 border border-gray-700 hover:border-purple-500/50
                 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10
                 disabled:opacity-50 disabled:cursor-not-allowed text-left h-full flex flex-col"
    >
      {/* Team Header with Icon */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden
                        bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20
                        group-hover:border-purple-500/40 transition-colors">
          {iconUrl ? (
            <Image
              src={iconUrl}
              alt={team.name}
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-purple-400 font-bold text-lg">
              {abbreviation.slice(0, 2)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate group-hover:text-purple-300 transition-colors">
            {team.name}
          </h3>
          <p className="text-gray-500 text-xs">{team.players.length} players</p>
        </div>
      </div>

      {/* Players List - Symmetrical 5-row layout */}
      <div className="flex-1 space-y-1">
        {sortedPlayers.map((playerName, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 py-1 px-2 rounded-md transition-colors ${
              playerName
                ? 'bg-gray-800/50 group-hover:bg-gray-700/50'
                : 'bg-gray-800/20'
            }`}
          >
            <RoleIndicator role={ROLE_ORDER[idx]} />
            <span className={`text-xs truncate flex-1 ${
              playerName ? 'text-gray-300' : 'text-gray-600 italic'
            }`}>
              {playerName || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-purple-500/30 transition-colors pointer-events-none" />
    </button>
  )
}

function RoleIndicator({ role }: { role: typeof ROLE_ORDER[number] }) {
  const colors: Record<string, string> = {
    top: 'bg-yellow-500/20 text-yellow-400',
    jungle: 'bg-green-500/20 text-green-400',
    mid: 'bg-blue-500/20 text-blue-400',
    adc: 'bg-red-500/20 text-red-400',
    support: 'bg-cyan-500/20 text-cyan-400',
  }

  const labels: Record<string, string> = {
    top: 'TOP',
    jungle: 'JGL',
    mid: 'MID',
    adc: 'ADC',
    support: 'SUP',
  }

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors[role]}`}>
      {labels[role]}
    </span>
  )
}

function SideButton({
  side,
  selected,
  onClick,
}: {
  side: 'blue' | 'red'
  selected: boolean
  onClick: () => void
}) {
  const isBlue = side === 'blue'

  return (
    <button
      onClick={onClick}
      className={`relative group px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? isBlue
            ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
            : 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          selected
            ? isBlue ? 'bg-blue-500' : 'bg-red-500'
            : 'bg-gray-700'
        }`}>
          <TeamIcon className="w-4 h-4 text-white" />
        </div>
        <span className={`font-bold transition-colors ${
          selected
            ? isBlue ? 'text-blue-400' : 'text-red-400'
            : 'text-gray-400'
        }`}>
          {isBlue ? 'Blue' : 'Red'}
        </span>
      </div>

      {selected && (
        <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
          isBlue ? 'bg-blue-500' : 'bg-red-500'
        }`}>
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
