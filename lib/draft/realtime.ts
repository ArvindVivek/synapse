/**
 * Supabase Realtime Broadcast integration for draft synchronization
 *
 * Uses Supabase Broadcast (not postgres_changes) for 50-100ms latency.
 * PITFALL-7 recommends Broadcast over WebSocket for quota management.
 *
 * Channel structure:
 * - Channel name: `draft:{draftId}`
 * - Event: `draft:action`
 * - Payload: { type, champion, role?, side, turn }
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { DraftAction, DraftState } from './types'

// ============================================================================
// Types
// ============================================================================

export interface DraftActionBroadcast {
  type: 'BAN' | 'PICK'
  champion: string
  role?: string | null
  side: 'blue' | 'red'
  turn: number
  timestamp: string
}

export interface DraftSyncPayload {
  event: 'action' | 'reset' | 'undo'
  data: DraftActionBroadcast | null
}

// ============================================================================
// Channel Management
// ============================================================================

/**
 * Create a Realtime channel for a draft session
 *
 * @param draftId - Unique draft session ID
 * @returns Realtime channel instance or null if Supabase is not configured
 *
 * @example
 * ```ts
 * const channel = createDraftChannel('abc123')
 * if (channel) await channel.subscribe()
 * ```
 */
export function createDraftChannel(draftId: string): RealtimeChannel | null {
  if (!isSupabaseConfigured()) {
    // Supabase not configured - realtime sync disabled
    return null
  }

  const supabase = createClient()
  if (!supabase) return null

  const channelName = `draft:${draftId}`

  return supabase.channel(channelName, {
    config: {
      broadcast: {
        self: false, // Don't receive own broadcasts
      },
    },
  })
}

/**
 * Subscribe to draft actions from other clients
 *
 * @param channel - Realtime channel (can be null if Supabase not configured)
 * @param onAction - Callback when action received
 * @returns Cleanup function
 *
 * @example
 * ```ts
 * const channel = createDraftChannel('abc123')
 * const unsubscribe = subscribeToDraft(channel, (payload) => {
 *   console.log('Remote action:', payload)
 *   // Update Zustand store with remote action
 *   useDraftStore.getState().executeBan(payload.data.champion)
 * })
 *
 * // Cleanup
 * return () => {
 *   unsubscribe()
 *   channel?.unsubscribe()
 * }
 * ```
 */
export function subscribeToDraft(
  channel: RealtimeChannel | null,
  onAction: (payload: DraftSyncPayload) => void
): () => void {
  // If no channel (Supabase not configured), return no-op cleanup
  if (!channel) {
    return () => {}
  }

  // Subscribe to broadcast events
  channel.on('broadcast', { event: 'draft:action' }, ({ payload }) => {
    onAction(payload as DraftSyncPayload)
  })

  // Subscribe to channel
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] Subscribed to draft channel')
    }
    // Silently ignore errors when Supabase connection fails
    // This is expected in local development without proper credentials
  })

  // Return cleanup function
  return () => {
    channel.unsubscribe()
  }
}

/**
 * Broadcast a draft action to other clients
 *
 * @param channel - Realtime channel
 * @param action - Draft action to broadcast
 * @param state - Current draft state (for context)
 *
 * @example
 * ```ts
 * const channel = createDraftChannel('abc123')
 * await broadcastAction(channel, { type: 'BAN', champion: 'Zed' }, draftState)
 * ```
 */
export async function broadcastAction(
  channel: RealtimeChannel,
  action: DraftAction,
  state: DraftState
): Promise<void> {
  // Only broadcast BAN and PICK actions
  if (action.type === 'UNDO' || action.type === 'RESET') {
    return
  }

  const currentTurnInfo = state.currentTurn
  const side = state.userSide

  const payload: DraftSyncPayload = {
    event: 'action',
    data: {
      type: action.type,
      champion: action.champion,
      role: action.type === 'PICK' ? action.role || null : null,
      side,
      turn: currentTurnInfo,
      timestamp: new Date().toISOString(),
    },
  }

  const result = await channel.send({
    type: 'broadcast',
    event: 'draft:action',
    payload,
  })

  if (result !== 'ok') {
    console.error('[Realtime] Failed to broadcast action:', result)
  }
}

/**
 * Broadcast draft reset to other clients
 *
 * @param channel - Realtime channel
 */
export async function broadcastReset(channel: RealtimeChannel): Promise<void> {
  const payload: DraftSyncPayload = {
    event: 'reset',
    data: null,
  }

  await channel.send({
    type: 'broadcast',
    event: 'draft:action',
    payload,
  })
}

/**
 * Broadcast draft undo to other clients
 *
 * @param channel - Realtime channel
 */
export async function broadcastUndo(channel: RealtimeChannel): Promise<void> {
  const payload: DraftSyncPayload = {
    event: 'undo',
    data: null,
  }

  await channel.send({
    type: 'broadcast',
    event: 'draft:action',
    payload,
  })
}

// ============================================================================
// React Hook (for UI integration)
// ============================================================================

/**
 * React hook for draft realtime synchronization
 *
 * Usage in components:
 * ```tsx
 * function DraftSimulator() {
 *   const draftId = 'abc123'
 *   const channel = useDraftRealtime(draftId)
 *
 *   const handleBan = (champion: string) => {
 *     const success = useDraftStore.getState().executeBan(champion)
 *     if (success && channel) {
 *       broadcastAction(channel, { type: 'BAN', champion }, state)
 *     }
 *   }
 * }
 * ```
 */
export function useDraftRealtime(
  draftId: string | null,
  onRemoteAction: (payload: DraftSyncPayload) => void
): RealtimeChannel | null {
  if (!draftId) return null

  const channel = createDraftChannel(draftId)

  // Subscribe on mount
  subscribeToDraft(channel, onRemoteAction)

  return channel
}
