'use client'

/**
 * Draft Simulator - LoL-Authentic Draft Experience
 *
 * Redesigned layout matching the actual LoL draft screen:
 * - Prominent phase header ("BAN A CHAMPION!")
 * - Champion grid as center focus
 * - Compact team columns on sides
 * - Two-step action flow (select + confirm)
 * - Bottom action bar with AI suggestions
 */

import { useEffect, useState, useCallback } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'
import {
  createDraftChannel,
  subscribeToDraft,
  DraftSyncPayload,
} from '@/lib/draft/realtime'

// New components for LoL-authentic layout
import { PhaseHeader } from '@/components/draft/phase-header'
import { TeamColumn } from '@/components/draft/team-column'
import { ChampionGrid } from '@/components/draft/champion-grid'
import { ActionBar } from '@/components/draft/action-bar'
import { OpponentSidebar } from '@/components/draft/opponent-sidebar'
import { SideSelector } from '@/components/draft/side-selector'

interface DraftSimulatorProps {
  draftId: string
  initialSide?: 'blue' | 'red'
}

// All champions from champion-properties
const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

/**
 * Main draft simulator with LoL-authentic layout
 */
export default function DraftSimulator({
  draftId,
  initialSide = 'blue',
}: DraftSimulatorProps) {
  // Draft store state
  const initializeDraft = useDraftStore((state) => state.initializeDraft)
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const isComplete = useDraftStore((state) => state.isComplete)
  const applyRemoteAction = useDraftStore((state) => state.applyRemoteAction)

  // Search and filter state (controlled by PhaseHeader)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)

  // Initialize draft on mount
  useEffect(() => {
    initializeDraft({
      id: draftId,
      userSide: initialSide,
      allChampions: ALL_CHAMPIONS,
    })
  }, [draftId, initialSide, initializeDraft])

  // Handle remote actions from realtime
  const handleRemoteAction = useCallback(
    (payload: DraftSyncPayload) => {
      applyRemoteAction(payload)
    },
    [applyRemoteAction]
  )

  // Subscribe to realtime updates
  useEffect(() => {
    if (!draftId) return

    const channel = createDraftChannel(draftId)
    const unsubscribe = subscribeToDraft(channel, handleRemoteAction)

    return () => {
      unsubscribe()
    }
  }, [draftId, handleRemoteAction])

  // Pre-draft: Side selection screen
  if (currentTurn === 0) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-2">SYNAPSE</h1>
        <p className="text-gray-400 mb-8">AI-Powered Draft Assistant</p>
        <SideSelector />
        <p className="text-gray-500 text-sm mt-4">
          Choose your side to begin the draft
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Phase Header */}
      <PhaseHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
      />

      {/* Main content area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Opponent Analysis Sidebar */}
        <OpponentSidebar className="w-52 flex-shrink-0" />

        {/* Blue Team Column */}
        <TeamColumn side="blue" className="w-28 flex-shrink-0" />

        {/* Center: Champion Grid */}
        <ChampionGrid
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          className="flex-1 min-w-0"
        />

        {/* Red Team Column */}
        <TeamColumn side="red" className="w-28 flex-shrink-0" />
      </main>

      {/* Bottom Action Bar */}
      <ActionBar draftId={draftId} />

      {/* Draft Complete Overlay */}
      {isComplete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 text-center max-w-md shadow-2xl border border-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Draft Complete!</h2>
            <p className="text-gray-400 mb-6">
              Review your team compositions and start a new draft.
            </p>

            <div className="flex gap-4 justify-center">
              <a
                href="/draft/new"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                New Draft
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
