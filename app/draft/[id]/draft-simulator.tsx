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
import {
  createDraftChannel,
  subscribeToDraft,
  DraftSyncPayload,
} from '@/lib/draft/realtime'
import { useAutoOpponent } from '@/lib/hooks/use-auto-opponent'

// New components for LoL-authentic layout
import { PhaseHeader } from '@/components/draft/phase-header'
import { TeamColumn } from '@/components/draft/team-column'
import { ChampionGrid } from '@/components/draft/champion-grid'
import { ActionBar } from '@/components/draft/action-bar'
import { OpponentSidebar } from '@/components/draft/opponent-sidebar'
import { SideSelector } from '@/components/draft/side-selector'
import { InsightsPanel } from '@/components/draft/insights-panel'

interface DraftSimulatorProps {
  draftId: string
}

/**
 * Main draft simulator with LoL-authentic layout
 */
export default function DraftSimulator({
  draftId,
}: DraftSimulatorProps) {
  // Draft store state
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const applyRemoteAction = useDraftStore((state) => state.applyRemoteAction)

  // Search and filter state (controlled by PhaseHeader)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)

  // Auto-play opponent turns
  useAutoOpponent()

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
        <SideSelector draftId={draftId} />
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

        {/* Right: AI Insights Panel */}
        <InsightsPanel className="w-64 flex-shrink-0" />
      </main>

      {/* Bottom Action Bar */}
      <ActionBar draftId={draftId} />
    </div>
  )
}
