'use client'

/**
 * Draft Simulator - Main client component container
 *
 * Manages the draft UI state with Zustand store.
 * Layout structure:
 * - Header: Turn indicator and side selector
 * - Main: Draft board (left), Champion grid (center), Panels (right)
 */

import { useEffect } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'
import { TurnIndicator } from '@/components/draft/turn-indicator'
import { SideSelector } from '@/components/draft/side-selector'

interface DraftSimulatorProps {
  id: string
  initialState?: any
}

/**
 * Main draft simulator container
 *
 * Initializes Zustand store with draft session and renders layout shell
 */
export default function DraftSimulator({ id, initialState }: DraftSimulatorProps) {
  const initializeDraft = useDraftStore((state) => state.initializeDraft)
  const currentTurn = useDraftStore((state) => state.currentTurn)

  // Get all champions from DAMAGE_TYPES keys
  const allChampions = Object.keys(DAMAGE_TYPES)

  // Initialize draft store on mount
  useEffect(() => {
    if (initialState) {
      initializeDraft({
        id,
        userSide: initialState.userSide || 'blue',
        allChampions,
      })
    }
  }, [id, initialState, initializeDraft, allChampions])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold">Draft Simulator</h1>
              <TurnIndicator />
            </div>
            {currentTurn === 0 && <SideSelector />}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Draft Board - placeholder for Task 2 */}
          <section className="col-span-3">
            <div className="bg-gray-800 rounded-lg p-4 h-full">
              <h2 className="text-lg font-semibold mb-4">Draft Board</h2>
              <p className="text-gray-400 text-sm">
                Draft board component will be added here
              </p>
            </div>
          </section>

          {/* Center: Champion Grid - placeholder for future plan */}
          <section className="col-span-6">
            <div className="bg-gray-800 rounded-lg p-4 h-full">
              <h2 className="text-lg font-semibold mb-4">Champions</h2>
              <p className="text-gray-400 text-sm">
                Champion grid will be added in next plan
              </p>
              <div className="mt-4 text-xs text-gray-500">
                {allChampions.length} champions available
              </div>
            </div>
          </section>

          {/* Right: Info Panels - placeholder for future plan */}
          <section className="col-span-3">
            <div className="bg-gray-800 rounded-lg p-4 h-full">
              <h2 className="text-lg font-semibold mb-4">Analytics</h2>
              <p className="text-gray-400 text-sm">
                Recommendation panels will be added in future plan
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
