'use client'

/**
 * Auto-play opponent turns hook
 *
 * Automatically makes picks/bans for the opponent when it's their turn.
 * Uses a brief delay for visual effect, then picks based on:
 * 1. Champion pool data (if available)
 * 2. Random selection from available champions
 */

import { useEffect, useRef } from 'react'
import { useDraftStore } from '@/lib/draft/store'
import { getTurnInfo } from '@/lib/draft/sequence'
import { ALL_CHAMPIONS } from '@/lib/draft/champion-data'

// Delay before auto-playing (ms)
const AUTO_PLAY_DELAY = 800

/**
 * Hook that auto-plays opponent turns
 *
 * Call this in the draft simulator to enable AI opponent.
 */
export function useAutoOpponent() {
  const currentTurn = useDraftStore((state) => state.currentTurn)
  const userSide = useDraftStore((state) => state.userSide)
  const isComplete = useDraftStore((state) => state.isComplete)
  const availableChampions = useDraftStore((state) => state.availableChampions)
  const executeBan = useDraftStore((state) => state.executeBan)
  const executePick = useDraftStore((state) => state.executePick)

  // Track if we're currently auto-playing to prevent double execution
  const isAutoPlaying = useRef(false)

  useEffect(() => {
    // Don't run if draft not started or complete
    if (currentTurn === 0 || isComplete) return

    // Get turn info
    const turnInfo = getTurnInfo(currentTurn)
    if (!turnInfo) return

    // Check if it's opponent's turn
    const isOpponentTurn = turnInfo.side !== userSide

    if (!isOpponentTurn || isAutoPlaying.current) return

    // Set flag to prevent double execution
    isAutoPlaying.current = true

    // Auto-play after delay
    const timer = setTimeout(() => {
      // Get available champions as array
      const available = Array.from(availableChampions)

      if (available.length === 0) {
        isAutoPlaying.current = false
        return
      }

      // Pick a champion (weighted random based on pro play popularity)
      const champion = pickWeightedChampion(available, turnInfo.action)

      // Execute the action (pass true for isOpponentAction to bypass user-turn validation)
      if (turnInfo.action === 'ban') {
        executeBan(champion, true)
      } else {
        executePick(champion, undefined, true)
      }

      isAutoPlaying.current = false
    }, AUTO_PLAY_DELAY)

    return () => {
      clearTimeout(timer)
      isAutoPlaying.current = false
    }
  }, [currentTurn, userSide, isComplete, availableChampions, executeBan, executePick])
}

/**
 * Pick a champion with weighted probability based on pro play meta
 *
 * High-priority picks are more likely to be selected.
 */
function pickWeightedChampion(available: string[], action: 'ban' | 'pick'): string {
  // Pro-play popular champions (higher weight)
  const highPriority = new Set([
    // Common bans
    'Ksante', 'Azir', 'Orianna', 'Viego', 'Lee Sin', 'Rell',
    // Common picks
    'Jinx', 'Aphelios', 'Thresh', 'Nautilus', 'Aatrox', 'Gnar',
    'Syndra', 'Viktor', 'Taliyah', 'Xayah', 'Rakan'
  ])

  // Medium priority
  const mediumPriority = new Set([
    'Sejuani', 'Maokai', 'Jarvan IV', 'Renekton', 'Camille',
    'Lulu', 'Karma', 'Jhin', 'Ezreal', 'Corki'
  ])

  // Build weighted list
  const weighted: string[] = []
  for (const champ of available) {
    const weight = highPriority.has(champ) ? 5
      : mediumPriority.has(champ) ? 3
      : 1

    for (let i = 0; i < weight; i++) {
      weighted.push(champ)
    }
  }

  // Random selection from weighted list
  const idx = Math.floor(Math.random() * weighted.length)
  return weighted[idx]
}
