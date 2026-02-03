'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { nanoid } from 'nanoid'
import { motion } from 'framer-motion'
import { Search, Sparkles, Target, Brain, TrendingUp, Zap } from 'lucide-react'
import { useDraftStore } from '@/lib/draft/store'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'
import { useTeams, Team } from '@/lib/hooks/use-teams'
import { DraftFormat } from '@/lib/draft/types'
import { getTeamIconUrl } from '@/lib/teams/team-icons'

const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

const DRAFT_FORMATS: { value: DraftFormat; label: string; description: string }[] = [
  { value: 'tournament', label: 'Tournament', description: 'Standard pro draft (5 bans, 5 picks)' },
  { value: 'fearless', label: 'Fearless', description: 'Champions can only be picked once per series' },
  { value: 'scrim', label: 'Scrim', description: 'Practice mode with relaxed rules' },
]

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Recommendations',
    description: 'Get intelligent pick and ban suggestions based on team compositions and meta analysis',
  },
  {
    icon: Target,
    title: 'Team-Aware Analysis',
    description: 'Recommendations tailored to opponent champion pools and player preferences',
  },
  {
    icon: TrendingUp,
    title: 'Win Probability Prediction',
    description: 'Real-time draft quality scoring and win probability calculations',
  },
  {
    icon: Zap,
    title: 'Instant Insights',
    description: 'Comprehensive draft report with strategic analysis and win conditions',
  },
]

export default function Home() {
  const [selectedSide, setSelectedSide] = useState<'blue' | 'red'>('blue')
  const [selectedFormat, setSelectedFormat] = useState<DraftFormat>('tournament')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)

  const { teams, loading, error } = useTeams()
  const router = useRouter()
  const initializeDraft = useDraftStore((state) => state.initializeDraft)

  const filteredTeams = useMemo(() => {
    if (!teams) return []
    return teams.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [teams, searchQuery])

  const handleStartDraft = async () => {
    if (!selectedTeam || isNavigating) return
    setIsNavigating(true)

    const draftId = nanoid(12)

    initializeDraft({
      id: draftId,
      userSide: selectedSide,
      allChampions: ALL_CHAMPIONS,
      format: selectedFormat,
      opponentTeam: {
        id: selectedTeam.id,
        name: selectedTeam.name,
        players: selectedTeam.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role as 'top' | 'jungle' | 'mid' | 'adc' | 'support',
        })),
      },
    })

    router.push(`/draft/${draftId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -30, 0], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 30, 0], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-2xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 bg-clip-text text-transparent"
          >
            SYNAPSE
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-2xl text-gray-300 mb-4 font-light"
          >
            AI-Powered Draft Intelligence for League of Legends
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            Get real-time draft recommendations, opponent analysis, and strategic insights powered by
            professional match data and machine learning algorithms
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
        >
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
              className="group relative bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 hover:border-cyan-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 mb-4">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Draft Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 p-8"
        >
          <h2 className="text-2xl font-bold mb-8 text-center">Configure Your Draft</h2>

          {/* Side Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-3">Your Side</label>
            <div className="flex gap-4">
              {(['blue', 'red'] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => setSelectedSide(side)}
                  className={`flex-1 relative group px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedSide === side
                      ? side === 'blue'
                        ? 'border-cyan-500 bg-cyan-500/20 shadow-lg shadow-cyan-500/20'
                        : 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={`font-bold text-lg ${
                      selectedSide === side
                        ? side === 'blue' ? 'text-cyan-400' : 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {side === 'blue' ? 'Blue' : 'Red'} Side
                    </span>
                  </div>
                  {selectedSide === side && (
                    <motion.div
                      layoutId="selectedSide"
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                        side === 'blue' ? 'bg-cyan-500' : 'bg-red-500'
                      }`}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {selectedSide === 'blue' ? 'First ban and first pick advantage' : 'Counter-pick advantage in later phases'}
            </p>
          </div>

          {/* Format Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-3">Draft Format</label>
            <div className="grid grid-cols-3 gap-3">
              {DRAFT_FORMATS.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className={`relative px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedFormat === format.value
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {format.label}
                  {selectedFormat === format.value && (
                    <motion.div
                      layoutId="selectedFormat"
                      className="absolute inset-0 rounded-xl border-2 border-cyan-400"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {DRAFT_FORMATS.find(f => f.value === selectedFormat)?.description}
            </p>
          </div>

          {/* Team Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-3">Opponent Team</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a team..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowTeamDropdown(true)
                  }}
                  onFocus={() => setShowTeamDropdown(true)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              {/* Selected Team Display */}
              {selectedTeam && !showTeamDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-cyan-500/30"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden">
                    {getTeamIconUrl(selectedTeam.name) ? (
                      <Image
                        src={getTeamIconUrl(selectedTeam.name)!}
                        alt={selectedTeam.name}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-cyan-400 font-bold text-sm">
                        {selectedTeam.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{selectedTeam.name}</p>
                    <p className="text-xs text-gray-400">{selectedTeam.players.length} players</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTeam(null)
                      setSearchQuery('')
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              )}

              {/* Dropdown */}
              {showTeamDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto"
                >
                  {loading ? (
                    <div className="p-4 text-center text-gray-400">Loading teams...</div>
                  ) : filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeam(team)
                          setSearchQuery(team.name)
                          setShowTeamDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left border-b border-gray-700 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {getTeamIconUrl(team.name) ? (
                            <Image
                              src={getTeamIconUrl(team.name)!}
                              alt={team.name}
                              width={40}
                              height={40}
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-cyan-400 font-bold text-sm">
                              {team.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{team.name}</p>
                          <p className="text-xs text-gray-400">{team.players.length} players</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">
                      {searchQuery ? 'No teams found' : 'Start typing to search...'}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <motion.button
            onClick={handleStartDraft}
            disabled={!selectedTeam || isNavigating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedTeam && !isNavigating
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isNavigating ? 'Starting Draft...' : selectedTeam ? 'Start Draft' : 'Select a team to continue'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
