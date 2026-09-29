'use client'

/**
 * Draft sessions live in this browser (localStorage), not on a server: a draft is small, belongs
 * to one person, and Synapse has no accounts. Reloading a draft page picks up where you left
 * off. The rules themselves are the pure functions in lib/draft/draft.ts.
 */

import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { DraftReport } from '@/lib/engine/report'
import { applyAction, undoUserMove, type ActionError } from './draft'
import type { Draft, DraftAction, Side } from './types'

/** Keep the most recent drafts only, so storage never grows without bound. */
export const MAX_SAVED_DRAFTS = 20

interface DraftStore {
  drafts: Record<string, Draft>
  reports: Record<string, DraftReport>
  save: (draft: Draft) => void
  /** Plays a move for `side`; returns the rule it broke, or null. */
  play: (id: string, action: DraftAction, side: Side) => ActionError | null
  undo: (id: string) => void
  saveReport: (id: string, report: DraftReport) => void
}

/** localStorage can be missing or throw (private windows, blocked storage): never crash on it. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value)
    } catch (err) {
      console.warn('[synapse] could not save the draft on this device', err)
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      /* nothing to clean up */
    }
  },
}

function prune(drafts: Record<string, Draft>): Record<string, Draft> {
  const ids = Object.keys(drafts)
  if (ids.length <= MAX_SAVED_DRAFTS) return drafts
  const keep = ids
    .sort((a, b) => drafts[b].startedAt.localeCompare(drafts[a].startedAt))
    .slice(0, MAX_SAVED_DRAFTS)
  return Object.fromEntries(keep.map((id) => [id, drafts[id]]))
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      drafts: {},
      reports: {},
      save: (draft) => set((s) => ({ drafts: prune({ ...s.drafts, [draft.id]: draft }) })),
      play: (id, action, side) => {
        const draft = get().drafts[id]
        if (!draft) return 'DRAFT_COMPLETE'
        const result = applyAction(draft, action, side)
        if (!result.ok) return result.error
        set((s) => ({ drafts: { ...s.drafts, [id]: result.draft } }))
        return null
      },
      undo: (id) => {
        const draft = get().drafts[id]
        if (!draft || draft.format !== 'scrim') return
        set((s) => {
          const reports = { ...s.reports }
          delete reports[id]
          return { drafts: { ...s.drafts, [id]: undoUserMove(draft) }, reports }
        })
      },
      saveReport: (id, report) => set((s) => ({ reports: { ...s.reports, [id]: report } })),
    }),
    {
      name: 'synapse-drafts',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        drafts: s.drafts,
        // Reports only for drafts still kept.
        reports: Object.fromEntries(Object.entries(s.reports).filter(([id]) => id in s.drafts)),
      }),
    },
  ),
)
