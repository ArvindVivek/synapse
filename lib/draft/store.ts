/**
 * Zustand store for draft state management
 *
 * Uses Immer middleware for immutable updates with mutable syntax.
 * Manages the complete draft lifecycle: initialization, picks, bans, undo, reset.
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type { DraftState, DraftPhase, TeamComposition, Role } from './types'
import { getTurnInfo, getNextTurn, isUserTurn, DRAFT_SEQUENCE } from './sequence'
import { validateAction, ValidationError } from './validation'
import type { DraftSyncPayload } from './realtime'

// Enable Immer MapSet plugin for Set support
enableMapSet()

/**
 * Create initial draft state
 */
const createInitialState = (): DraftState => ({
  id: null,
  currentTurn: 0,
  phase: 'ban1',
  userSide: 'blue',
  blue: { bans: [], picks: [] },
  red: { bans: [], picks: [] },
  availableChampions: new Set(),
  isComplete: false,
  startedAt: null,
  completedAt: null,
})

/**
 * Draft store interface extending DraftState with actions
 */
interface DraftStore extends DraftState {
  // Actions
  initializeDraft: (params: {
    id: string
    userSide: 'blue' | 'red'
    allChampions: string[]
  }) => void

  executeBan: (champion: string) => boolean
  executePick: (champion: string, role?: Role) => boolean

  undo: () => void
  reset: () => void
  setUserSide: (side: 'blue' | 'red') => void

  // Validation error tracking
  lastValidationError: ValidationError | null
  getLastError: () => ValidationError | null

  // Realtime sync
  applyRemoteAction: (payload: DraftSyncPayload) => void

  // Computed/derived helpers
  getCurrentTurnInfo: () => ReturnType<typeof getTurnInfo>
  isMyTurn: () => boolean
  canBan: (champion: string) => boolean
  canPick: (champion: string) => boolean
  getTeamComposition: (side: 'blue' | 'red') => TeamComposition
}

/**
 * Draft state store
 *
 * Manages draft progression through 20 turns with ban/pick actions.
 * Uses Immer for safe immutable updates.
 */
export const useDraftStore = create<DraftStore>()(
  immer((set, get) => ({
    ...createInitialState(),
    lastValidationError: null,

    /**
     * Initialize a new draft session
     */
    initializeDraft: ({ id, userSide, allChampions }) =>
      set((state) => {
        state.id = id
        state.userSide = userSide
        state.currentTurn = 1
        state.phase = 'ban1'
        state.availableChampions = new Set(allChampions)
        state.isComplete = false
        state.startedAt = new Date()
        state.completedAt = null
        state.blue = { bans: [], picks: [] }
        state.red = { bans: [], picks: [] }
        state.lastValidationError = null
      }),

    /**
     * Execute a ban action
     *
     * @returns true if ban was successful, false if invalid
     */
    executeBan: (champion: string) => {
      const state = get()
      const result = validateAction(state, { type: 'BAN', champion })

      // Type guard for validation failure
      if (result.valid === false) {
        console.warn('[DraftStore] Ban rejected:', result.error.message)
        set((draft) => {
          draft.lastValidationError = result.error
        })
        return false
      }

      // Execute ban
      set((draft) => {
        draft.lastValidationError = null
        const currentTurn = getTurnInfo(draft.currentTurn)
        if (!currentTurn) return

        const side = currentTurn.side
        draft[side].bans.push(champion)
        draft.availableChampions.delete(champion)

        // Advance turn
        const nextTurn = getNextTurn(draft.currentTurn)
        if (nextTurn) {
          draft.currentTurn = nextTurn.turnNumber
          draft.phase = nextTurn.phase
        } else {
          draft.isComplete = true
          draft.completedAt = new Date()
        }
      })

      return true
    },

    /**
     * Execute a pick action
     *
     * @returns true if pick was successful, false if invalid
     */
    executePick: (champion: string, role?: Role) => {
      const state = get()
      const result = validateAction(state, { type: 'PICK', champion, role })

      // Type guard for validation failure
      if (result.valid === false) {
        console.warn('[DraftStore] Pick rejected:', result.error.message)
        set((draft) => {
          draft.lastValidationError = result.error
        })
        return false
      }

      // Execute pick
      set((draft) => {
        draft.lastValidationError = null
        const currentTurn = getTurnInfo(draft.currentTurn)
        if (!currentTurn) return

        const side = currentTurn.side
        draft[side].picks.push({
          champion,
          role: role || null,
        })
        draft.availableChampions.delete(champion)

        // Advance turn
        const nextTurn = getNextTurn(draft.currentTurn)
        if (nextTurn) {
          draft.currentTurn = nextTurn.turnNumber
          draft.phase = nextTurn.phase
        } else {
          draft.isComplete = true
          draft.completedAt = new Date()
        }
      })

      return true
    },

    /**
     * Undo the last action
     *
     * Reverts the last ban or pick, restores champion to available set,
     * and decrements turn number.
     */
    undo: () =>
      set((state) => {
        if (state.currentTurn <= 1) return // Can't undo before first turn

        const previousTurn = state.currentTurn - 1
        const previousTurnInfo = getTurnInfo(previousTurn)
        if (!previousTurnInfo) return

        const side = previousTurnInfo.side
        const action = previousTurnInfo.action

        // Restore champion to available set
        let champion: string | undefined
        if (action === 'ban') {
          champion = state[side].bans.pop()
        } else {
          const pick = state[side].picks.pop()
          champion = pick?.champion
        }

        if (champion) {
          state.availableChampions.add(champion)
        }

        // Revert turn
        state.currentTurn = previousTurn
        state.phase = previousTurnInfo.phase
        state.isComplete = false
        state.completedAt = null
      }),

    /**
     * Reset draft to initial state
     */
    reset: () =>
      set((state) => {
        Object.assign(state, createInitialState())
        state.lastValidationError = null
      }),

    /**
     * Set user side (only allowed before draft starts)
     */
    setUserSide: (side: 'blue' | 'red') =>
      set((state) => {
        if (state.currentTurn === 0) {
          state.userSide = side
        }
      }),

    /**
     * Get the last validation error
     */
    getLastError: () => {
      const state = get()
      return state.lastValidationError
    },

    /**
     * Get current turn information
     */
    getCurrentTurnInfo: () => {
      const state = get()
      return getTurnInfo(state.currentTurn)
    },

    /**
     * Check if it's the user's turn
     */
    isMyTurn: () => {
      const state = get()
      return isUserTurn(state.currentTurn, state.userSide)
    },

    /**
     * Check if a champion can be banned
     */
    canBan: (champion: string) => {
      const state = get()
      const currentTurn = getTurnInfo(state.currentTurn)
      return (
        !!currentTurn &&
        currentTurn.action === 'ban' &&
        state.availableChampions.has(champion)
      )
    },

    /**
     * Check if a champion can be picked
     */
    canPick: (champion: string) => {
      const state = get()
      const currentTurn = getTurnInfo(state.currentTurn)
      return (
        !!currentTurn &&
        currentTurn.action === 'pick' &&
        state.availableChampions.has(champion)
      )
    },

    /**
     * Get team composition for a specific side
     */
    getTeamComposition: (side: 'blue' | 'red') => {
      const state = get()
      return state[side]
    },

    /**
     * Apply remote action from Supabase Realtime Broadcast
     *
     * This method is called when another client executes an action.
     * It bypasses validation since the action was already validated
     * by the client that executed it.
     *
     * @param payload - Broadcast payload from Supabase Realtime
     */
    applyRemoteAction: (payload: DraftSyncPayload) => {
      set((state) => {
        if (payload.event === 'reset') {
          // Reset draft to initial state
          Object.assign(state, createInitialState())
          state.lastValidationError = null
          return
        }

        if (payload.event === 'undo') {
          // Undo last action
          if (state.currentTurn <= 1) return

          const previousTurn = state.currentTurn - 1
          const previousTurnInfo = getTurnInfo(previousTurn)
          if (!previousTurnInfo) return

          const side = previousTurnInfo.side
          const action = previousTurnInfo.action

          // Restore champion to available set
          let champion: string | undefined
          if (action === 'ban') {
            champion = state[side].bans.pop()
          } else {
            const pick = state[side].picks.pop()
            champion = pick?.champion
          }

          if (champion) {
            state.availableChampions.add(champion)
          }

          // Revert turn
          state.currentTurn = previousTurn
          state.phase = previousTurnInfo.phase
          state.isComplete = false
          state.completedAt = null
          return
        }

        if (payload.event === 'action' && payload.data) {
          const { type, champion, role, side } = payload.data

          // Apply action (already validated by remote client)
          if (type === 'BAN') {
            state[side].bans.push(champion)
            state.availableChampions.delete(champion)
          } else if (type === 'PICK') {
            state[side].picks.push({
              champion,
              role: (role as Role) || null,
            })
            state.availableChampions.delete(champion)
          }

          // Advance turn
          const nextTurn = getNextTurn(state.currentTurn)
          if (nextTurn) {
            state.currentTurn = nextTurn.turnNumber
            state.phase = nextTurn.phase
          } else {
            state.isComplete = true
            state.completedAt = new Date()
          }
        }
      })
    },
  }))
)
