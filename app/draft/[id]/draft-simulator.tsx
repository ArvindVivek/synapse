'use client'

/**
 * Draft Simulator - Complete integrated draft experience
 *
 * Full-featured draft simulator with all UI components working together.
 *
 * Layout structure:
 * - Header: Logo, side selector (pre-draft), turn indicator, win-rate gauge
 * - Left sidebar (w-72): Player selector, player pool panel
 * - Center (flex-1): Draft board, champion grid
 * - Right sidebar (w-80): Recommendation/ban panels, prediction panel
 * - Overlay: Draft complete modal
 *
 * Components integrated:
 * - DraftBoard: Blue vs Red team compositions
 * - ChampionGrid: Champion selection with search/filter
 * - PlayerSelector: Opponent player selection by role
 * - PlayerPoolPanel: Selected player's champion pool
 * - RecommendationPanel: Pick recommendations (pick phases)
 * - BanStrategyPanel: Ban recommendations (ban phases)
 * - PredictionPanel: Opponent pick predictions
 * - WinRateGauge: Animated win probability display
 */

import { useEffect, useState, useCallback } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'
import {
  createDraftChannel,
  subscribeToDraft,
  DraftSyncPayload,
} from '@/lib/draft/realtime'

// Components
import { DraftBoard } from '@/components/draft/draft-board'
import { ChampionGrid } from '@/components/draft/champion-grid'
import { SideSelector } from '@/components/draft/side-selector'
import { TurnIndicator } from '@/components/draft/turn-indicator'
import {
  PlayerSelector,
  type Role,
  type PlayerInfo,
  type SelectedPlayers,
  createEmptySelectedPlayers,
} from '@/components/draft/player-selector'
import { PlayerPoolPanel } from '@/components/draft/player-pool-panel'
import { RecommendationPanel } from '@/components/draft/recommendation-panel'
import { BanStrategyPanel } from '@/components/draft/ban-strategy-panel'
import { PredictionPanel } from '@/components/draft/prediction-panel'
import { WinRateGauge } from '@/components/draft/winrate-gauge'

interface DraftSimulatorProps {
  draftId: string
  initialSide?: 'blue' | 'red'
}

// All champions from champion-properties
const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

/**
 * Main draft simulator container
 *
 * Integrates all draft components into a cohesive experience.
 * Manages player selection state locally and passes to relevant components.
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

  // Player selection state (managed locally)
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayers>(
    createEmptySelectedPlayers()
  )

  // Currently viewed player for pool panel
  const [viewingPlayer, setViewingPlayer] = useState<{
    id: string
    name: string
    role: string
  } | null>(null)

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

  // Handle player selection
  const handlePlayerSelect = (role: Role, player: PlayerInfo | null) => {
    setSelectedPlayers((prev) => ({ ...prev, [role]: player }))
    if (player) {
      setViewingPlayer({ id: player.id, name: player.name, role })
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-blue-400">SYNAPSE</h1>
            <span className="text-gray-500 text-sm">Draft Simulator</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Side selector (only at turn 0) */}
            {currentTurn === 0 && <SideSelector />}

            {/* Turn indicator */}
            <TurnIndicator />

            {/* Win rate gauge */}
            <WinRateGauge />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex max-w-[1800px] mx-auto p-4 gap-4 h-[calc(100vh-72px)]">
        {/* Left sidebar: Player selection + Pool */}
        <aside className="w-72 flex-shrink-0 space-y-4 overflow-y-auto">
          <PlayerSelector
            selectedPlayers={selectedPlayers}
            onPlayerSelect={handlePlayerSelect}
          />

          {viewingPlayer ? (
            <PlayerPoolPanel
              playerId={viewingPlayer.id}
              playerName={viewingPlayer.name}
              role={viewingPlayer.role}
            />
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400 h-64 flex items-center justify-center">
              <p className="text-sm">Select a player to view their champion pool</p>
            </div>
          )}
        </aside>

        {/* Center: Draft board + Champion grid */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
          {/* Draft board */}
          <div className="flex-shrink-0">
            <DraftBoard />
          </div>

          {/* Champion selection grid */}
          <div className="flex-1 min-h-0">
            <ChampionGrid />
          </div>
        </div>

        {/* Right sidebar: Recommendations/Bans/Predictions */}
        <aside className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">
          {/* Recommendations (pick phases) or Bans (ban phases) */}
          <RecommendationPanel />
          <BanStrategyPanel />

          {/* Predictions */}
          <PredictionPanel selectedPlayers={selectedPlayers} />
        </aside>
      </main>

      {/* Draft complete overlay */}
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
              The draft has finished. Review your team composition and win-rate
              projection in the header.
            </p>

            <div className="flex gap-4 justify-center">
              <a
                href="/draft/new"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                New Draft
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Review Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
