'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { nanoid } from 'nanoid'
import { motion } from 'framer-motion'
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
      {/* Animated Background with Floating Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs with Motion */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            y: [0, 30, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500 to-transparent rounded-full"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header with Staggered Animation */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl blur-xl"
              />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/30">
                <Image src="/c9-logo.png" alt="Cloud9" width={48} height={48} className="object-contain" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent"
            >
              SYNAPSE
            </motion.h1>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg text-gray-400 font-light"
          >
            AI-Powered Draft Assistant for League of Legends
          </motion.p>
        </motion.header>

        {/* Draft Setup Row with Animation */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-10"
        >
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 shadow-xl shadow-black/20">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              {/* Side Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center uppercase tracking-wider">
                  Your Side
                </h3>
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
              <div className="hidden md:block w-px h-20 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

              {/* Format Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 text-center uppercase tracking-wider">
                  Draft Format
                </h3>
                <div className="flex gap-2">
                  {DRAFT_FORMATS.map((format, index) => (
                    <motion.button
                      key={format.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      onClick={() => setSelectedFormat(format.value)}
                      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedFormat === format.value
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
                      }`}
                      title={format.description}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {format.label}
                      {selectedFormat === format.value && (
                        <motion.div
                          layoutId="activeFormat"
                          className="absolute inset-0 rounded-lg border-2 border-cyan-400/50"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
                <motion.p
                  key={selectedFormat}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-gray-500 mt-2 text-center"
                >
                  {DRAFT_FORMATS.find(f => f.value === selectedFormat)?.description}
                </motion.p>
              </div>
            </div>

            {/* Side Info with Animation */}
            <motion.div
              key={selectedSide}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center mt-4"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border backdrop-blur-sm ${
                selectedSide === 'blue'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 shadow-lg shadow-red-500/10'
              }`}>
                <TeamIcon className="w-4 h-4" />
                <span className="font-medium">
                  {selectedSide === 'blue'
                    ? 'Blue side bans first and gets first pick'
                    : 'Red side gets counter-pick advantage'
                  }
                </span>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Team Selection with Animation */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Select Opponent Team</h2>
              <p className="text-sm text-gray-500 mt-1">Choose your opponent to begin draft analysis</p>
            </div>
          </div>

          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-16"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <LoadingSpinner />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl"
                  />
                </div>
                <span className="text-gray-400 font-medium">Loading teams...</span>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-red-500/10 border border-red-500/30 rounded-xl"
            >
              <p className="text-red-400 mb-2 font-semibold">Failed to load teams</p>
              <p className="text-gray-500 text-sm">Please check your connection and try again</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {teams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.8 + index * 0.05,
                    ease: 'easeOut',
                  }}
                >
                  <TeamCard
                    team={team}
                    onClick={() => handleSelectTeam(team)}
                    disabled={isNavigating}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Role Icons Footer with Animation */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-16 text-center"
        >
          <div className="flex items-center justify-center gap-6 mb-4">
            {[
              { Icon: TopIcon, color: 'text-yellow-400/60', hoverColor: 'hover:text-yellow-400', delay: 0 },
              { Icon: JungleIcon, color: 'text-green-400/60', hoverColor: 'hover:text-green-400', delay: 0.1 },
              { Icon: MidIcon, color: 'text-blue-400/60', hoverColor: 'hover:text-blue-400', delay: 0.2 },
              { Icon: AdcIcon, color: 'text-red-400/60', hoverColor: 'hover:text-red-400', delay: 0.3 },
              { Icon: SupportIcon, color: 'text-cyan-400/60', hoverColor: 'hover:text-cyan-400', delay: 0.4 },
            ].map(({ Icon, color, hoverColor, delay }, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.3 + delay }}
                whileHover={{ scale: 1.2, y: -5 }}
                className={`${color} ${hoverColor} transition-colors cursor-pointer`}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
            ))}
          </div>
          <p className="text-gray-600 text-sm">
            Powered by professional match data
          </p>
        </motion.footer>
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
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className="group relative bg-gray-900/80 border border-gray-800 rounded-xl p-4 transition-all duration-300
                 disabled:opacity-50 disabled:cursor-not-allowed text-left h-full flex flex-col
                 hover:bg-gray-800/90 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20
                 backdrop-blur-sm overflow-hidden"
    >
      {/* Animated Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-cyan-500/0
                      group-hover:from-cyan-500/10 group-hover:via-blue-500/5 group-hover:to-cyan-500/10
                      transition-all duration-500 rounded-xl pointer-events-none" />

      {/* Team Header with Icon */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden
                        bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20
                        group-hover:border-cyan-500/50 group-hover:shadow-lg group-hover:shadow-cyan-500/20
                        transition-all duration-300">
          {iconUrl ? (
            <Image
              src={iconUrl}
              alt={team.name}
              width={48}
              height={48}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <span className="text-cyan-400 font-bold text-lg group-hover:text-cyan-300 transition-colors">
              {abbreviation.slice(0, 2)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate group-hover:text-cyan-300 transition-colors">
            {team.name}
          </h3>
          <p className="text-gray-500 text-xs group-hover:text-gray-400 transition-colors">
            {team.players.length} players
          </p>
        </div>
      </div>

      {/* Players List - Symmetrical 5-row layout */}
      <div className="relative flex-1 space-y-1.5">
        {sortedPlayers.map((playerName, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-md transition-all duration-200 ${
              playerName
                ? 'bg-gray-800/60 group-hover:bg-gray-700/60 border border-gray-700/50 group-hover:border-cyan-500/20'
                : 'bg-gray-800/20 border border-transparent'
            }`}
          >
            <RoleIndicator role={ROLE_ORDER[idx]} />
            <span className={`text-xs truncate flex-1 ${
              playerName ? 'text-gray-300 group-hover:text-gray-200' : 'text-gray-600 italic'
            }`}>
              {playerName || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Animated Border Glow */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent
                      group-hover:border-cyan-500/30 transition-all duration-300 pointer-events-none" />

      {/* Corner Accent */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-500/0 to-transparent
                      group-hover:from-cyan-500/20 transition-all duration-500 rounded-bl-full pointer-events-none" />
    </motion.button>
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
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative group px-6 py-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${
        selected
          ? isBlue
            ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/30'
            : 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/30'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
      }`}
    >
      {/* Animated Background Gradient */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`absolute inset-0 bg-gradient-to-r ${
            isBlue
              ? 'from-blue-500/10 via-blue-500/5 to-cyan-500/10'
              : 'from-red-500/10 via-red-500/5 to-rose-500/10'
          }`}
        />
      )}

      <div className="relative flex items-center gap-2">
        <motion.div
          animate={selected ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
            selected
              ? isBlue
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50'
                : 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50'
              : 'bg-gray-700 group-hover:bg-gray-600'
          }`}
        >
          <TeamIcon className="w-4 h-4 text-white" />
        </motion.div>
        <span className={`font-bold transition-colors ${
          selected
            ? isBlue ? 'text-blue-400' : 'text-red-400'
            : 'text-gray-400 group-hover:text-gray-300'
        }`}>
          {isBlue ? 'Blue' : 'Red'}
        </span>
      </div>

      {selected && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center ${
            isBlue
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50'
              : 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50'
          }`}
        >
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}

      {/* Border Pulse Effect */}
      {selected && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute inset-0 rounded-xl border-2 ${
            isBlue ? 'border-blue-400/30' : 'border-red-400/30'
          } pointer-events-none`}
        />
      )}
    </motion.button>
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
    <div className="relative w-12 h-12">
      {/* Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0"
      >
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle
            className="text-cyan-500/30"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="text-cyan-500"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </motion.div>

      {/* Inner Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-2"
      >
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
          <circle
            className="text-blue-500"
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      </motion.div>
    </div>
  )
}
