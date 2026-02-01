'use client'

/**
 * Team Selector Component with Search/Filter
 *
 * Allows users to search and select opponent teams before starting draft.
 * Features combobox-style search with filtering.
 */

import { useState, useRef, useEffect } from 'react'
import { useTeams, Team } from '@/lib/hooks/use-teams'
import {
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
} from '@/components/ui/icons'

interface TeamSelectorProps {
  selectedTeam: Team | null
  onSelectTeam: (team: Team | null) => void
}

const RoleIcon = ({ role, className }: { role: string; className?: string }) => {
  switch (role) {
    case 'top': return <TopIcon className={className} />
    case 'jungle': return <JungleIcon className={className} />
    case 'mid': return <MidIcon className={className} />
    case 'adc': return <AdcIcon className={className} />
    case 'support': return <SupportIcon className={className} />
    default: return null
  }
}

const roleColors: Record<string, string> = {
  top: 'text-yellow-400',
  jungle: 'text-green-400',
  mid: 'text-blue-400',
  adc: 'text-red-400',
  support: 'text-cyan-400',
}

export function TeamSelector({ selectedTeam, onSelectTeam }: TeamSelectorProps) {
  const { teams, loading, error } = useTeams()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter teams based on search query
  const filteredTeams = teams.filter(team => {
    const query = searchQuery.toLowerCase()
    // Search by team name or player names
    return team.name.toLowerCase().includes(query) ||
      team.players.some(p => p.name.toLowerCase().includes(query))
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectTeam = (team: Team) => {
    onSelectTeam(team)
    setSearchQuery('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelectTeam(null)
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
          <span className="text-gray-400">Loading teams...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-red-500/30">
        <p className="text-red-400 text-sm">Failed to load teams</p>
        <p className="text-gray-500 text-xs mt-1">Continue without opponent scouting</p>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Select Opponent Team (Optional)
      </label>

      {/* Selected Team Display or Search Input */}
      {selectedTeam ? (
        <div className="bg-gray-800/80 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-purple-400 font-bold text-lg">
                  {selectedTeam.name.charAt(0)}
                </span>
              </div>
              <div>
                <h4 className="text-white font-semibold">{selectedTeam.name}</h4>
                <p className="text-gray-500 text-xs">{selectedTeam.players.length} players</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Player list */}
          <div className="grid grid-cols-5 gap-2">
            {selectedTeam.players.map(player => (
              <div key={player.id} className="text-center">
                <div className={`w-8 h-8 mx-auto rounded-lg bg-gray-700/50 flex items-center justify-center mb-1 ${roleColors[player.role]}`}>
                  <RoleIcon role={player.role} className="w-4 h-4" />
                </div>
                <span className="text-xs text-gray-400 block truncate">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search by team or player name..."
            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 text-white
                       placeholder-gray-500 focus:outline-none focus:border-purple-500/50
                       transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !selectedTeam && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl
                       shadow-2xl max-h-80 overflow-y-auto z-50">
          {filteredTeams.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No teams match your search' : 'No teams available'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 font-bold">
                      {team.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{team.name}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      {team.players.slice(0, 5).map(player => (
                        <span key={player.id} className={`${roleColors[player.role]} text-xs`}>
                          <RoleIcon role={player.role} className="w-3 h-3" />
                        </span>
                      ))}
                      <span className="text-gray-500 text-xs ml-1">
                        {team.players.map(p => p.name).join(', ')}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skip option */}
      {!selectedTeam && !isOpen && (
        <p className="text-gray-600 text-xs mt-2 text-center">
          Skip to use generic opponent analysis
        </p>
      )}
    </div>
  )
}
