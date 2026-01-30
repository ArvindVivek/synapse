'use client'

/**
 * Side Selector Component
 *
 * Select Blue/Red side and start the draft
 * Calls initializeDraft when user clicks Start Draft
 */

import { useState } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'

// All champions from champion-properties
const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

interface SideSelectorProps {
  draftId: string
}

/**
 * Blue/Red side selector with Start Draft button
 */
export function SideSelector({ draftId }: SideSelectorProps) {
  const [selectedSide, setSelectedSide] = useState<'blue' | 'red'>('blue')
  const initializeDraft = useDraftStore((state) => state.initializeDraft)

  const handleStartDraft = () => {
    initializeDraft({
      id: draftId,
      userSide: selectedSide,
      allChampions: ALL_CHAMPIONS,
    })
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 mr-2">Your Side:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelectedSide('blue')}
            className={`
              px-6 py-3 rounded-lg font-semibold text-lg transition
              ${selectedSide === 'blue'
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            Blue Side
          </button>
          <button
            type="button"
            onClick={() => setSelectedSide('red')}
            className={`
              px-6 py-3 rounded-lg font-semibold text-lg transition
              ${selectedSide === 'red'
                ? 'bg-red-500 text-white ring-2 ring-red-300'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            Red Side
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 text-center max-w-md">
        {selectedSide === 'blue' ? (
          <p>Blue side bans first and gets first pick.</p>
        ) : (
          <p>Red side responds to blue&apos;s bans and gets counter-pick advantage.</p>
        )}
      </div>

      <button
        onClick={handleStartDraft}
        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-lg transition-colors"
      >
        Start Draft
      </button>
    </div>
  )
}
