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
  { value: 'tournament', label: 'Tournament', description: 'Standard 5v5' },
  { value: 'fearless', label: 'Fearless', description: 'No repeat picks' },
  { value: 'scrim', label: 'Scrim', description: 'Practice mode' },
]

const FEATURES = [
  { icon: Brain, title: 'AI Recommendations', description: 'Smart picks based on meta' },
  { icon: Target, title: 'Team Analysis', description: 'Opponent champion pools' },
  { icon: TrendingUp, title: 'Win Prediction', description: 'Real-time scoring' },
  { icon: Zap, title: 'Instant Insights', description: 'Strategic analysis' },
]

export default function Home() {
  const [selectedSide, setSelectedSide] = useState<'blue' | 'red'>('blue')
  const [selectedFormat, setSelectedFormat] = useState<DraftFormat>('tournament')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)

  const { teams, loading } = useTeams()
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Column: Branding + Features */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Compact Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl blur-lg opacity-50" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  SYNAPSE
                </h1>
                <p className="text-sm text-gray-400">AI Draft Intelligence for LoL</p>
              </div>
            </div>

            {/* Compact Features */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + idx * 0.1 }}
                  className="group relative bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800 p-3 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded bg-cyan-500/10">
                      <feature.icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-white mb-0.5">{feature.title}</h3>
                      <p className="text-[10px] text-gray-400 leading-tight">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Tagline */}
            <p className="text-xs text-gray-500 italic">
              Powered by professional match data and machine learning
            </p>
          </motion.div>

          {/* Right Column: Configuration */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-800 p-6"
          >
            <h2 className="text-xl font-bold mb-4 text-center">Start Your Draft</h2>

            {/* Side Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-2">Your Side</label>
              <div className="grid grid-cols-2 gap-2">
                {(['blue', 'red'] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setSelectedSide(side)}
                    className={`relative px-4 py-2 rounded-lg border transition-all text-sm font-semibold ${
                      selectedSide === side
                        ? side === 'blue'
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                          : 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {side === 'blue' ? 'Blue' : 'Red'} Side
                    {selectedSide === side && (
                      <motion.div
                        layoutId="selectedSide"
                        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                          side === 'blue' ? 'bg-cyan-500' : 'bg-red-500'
                        }`}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      >
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1 text-center">
                {selectedSide === 'blue' ? 'First pick advantage' : 'Counter-pick advantage'}
              </p>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-2">Draft Format</label>
              <div className="grid grid-cols-3 gap-2">
                {DRAFT_FORMATS.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setSelectedFormat(format.value)}
                    className={`relative px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedFormat === format.value
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1 text-center">
                {DRAFT_FORMATS.find(f => f.value === selectedFormat)?.description}
              </p>
            </div>

            {/* Team Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-2">Opponent Team</label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowTeamDropdown(true)
                    }}
                    onFocus={() => setShowTeamDropdown(true)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Selected Team Display */}
                {selectedTeam && !showTeamDropdown && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-gray-800 rounded-lg border border-cyan-500/30">
                    <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {getTeamIconUrl(selectedTeam.name) ? (
                        <Image
                          src={getTeamIconUrl(selectedTeam.name)!}
                          alt={selectedTeam.name}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-cyan-400 font-bold text-xs">
                          {selectedTeam.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{selectedTeam.name}</p>
                      <p className="text-[10px] text-gray-400">{selectedTeam.players.length} players</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTeam(null)
                        setSearchQuery('')
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Dropdown */}
                {showTeamDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto"
                  >
                    {loading ? (
                      <div className="p-3 text-center text-sm text-gray-400">Loading...</div>
                    ) : filteredTeams.length > 0 ? (
                      filteredTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => {
                            setSelectedTeam(team)
                            setSearchQuery(team.name)
                            setShowTeamDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-700 transition-colors text-left border-b border-gray-700 last:border-0"
                        >
                          <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {getTeamIconUrl(team.name) ? (
                              <Image
                                src={getTeamIconUrl(team.name)!}
                                alt={team.name}
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            ) : (
                              <span className="text-cyan-400 font-bold text-xs">
                                {team.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                            <p className="text-[10px] text-gray-400">{team.players.length} players</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-gray-400">
                        {searchQuery ? 'No teams found' : 'Type to search...'}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartDraft}
              disabled={!selectedTeam || isNavigating}
              className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                selectedTeam && !isNavigating
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isNavigating ? 'Starting...' : selectedTeam ? 'Start Draft' : 'Select a team'}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
