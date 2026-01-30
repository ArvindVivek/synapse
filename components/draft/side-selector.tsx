'use client'

/**
 * Side Selector Component
 *
 * Toggle switch for Blue/Red side selection
 * Only enabled when currentTurn === 0 (before draft starts)
 */

import { useDraftStore } from '@/lib/draft/store'

/**
 * Blue/Red side toggle
 * Disabled after draft starts (turn > 0)
 */
export function SideSelector() {
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const userSide = useDraftStore((state) => state.userSide)
  const setUserSide = useDraftStore((state) => state.setUserSide)

  const isDisabled = currentTurn > 0

  const handleSideChange = (side: 'blue' | 'red') => {
    if (!isDisabled && setUserSide) {
      setUserSide(side)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 mr-2">Your Side:</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSideChange('blue')}
          disabled={isDisabled}
          className={`
            px-4 py-2 rounded-lg font-semibold text-sm transition
            ${userSide === 'blue'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Blue
        </button>
        <button
          type="button"
          onClick={() => handleSideChange('red')}
          disabled={isDisabled}
          className={`
            px-4 py-2 rounded-lg font-semibold text-sm transition
            ${userSide === 'red'
              ? 'bg-red-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Red
        </button>
      </div>
    </div>
  )
}
