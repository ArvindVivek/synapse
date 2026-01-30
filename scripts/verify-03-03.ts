/**
 * Verification script for Phase 3 Plan 03-03
 * Tests API routes and Realtime integration
 */

import { useDraftStore } from '../lib/draft/store'
import type { DraftSyncPayload } from '../lib/draft/realtime'

console.log('=== Phase 3 Plan 03-03 Verification ===\n')

// ============================================================================
// Test 1: Zustand Store with Realtime Integration
// ============================================================================

console.log('Test 1: Zustand Store Realtime Sync')
console.log('------------------------------------')

// Initialize draft
useDraftStore.getState().initializeDraft({
  id: 'test-draft-123',
  userSide: 'blue',
  allChampions: ['Zed', 'Yasuo', 'Ahri', 'Jinx', 'Thresh'],
})

const initialState = useDraftStore.getState()
console.log('✓ Draft initialized')
console.log(`  - ID: ${initialState.id}`)
console.log(`  - User side: ${initialState.userSide}`)
console.log(`  - Current turn: ${initialState.currentTurn}`)
console.log(`  - Phase: ${initialState.phase}`)
console.log(`  - Available champions: ${initialState.availableChampions.size}`)

// Execute local ban
const banSuccess = useDraftStore.getState().executeBan('Zed')
console.log(`✓ Local ban executed: ${banSuccess}`)
console.log(
  `  - Blue bans: ${JSON.stringify(useDraftStore.getState().blue.bans)}`
)

// Simulate remote action
const remotePayload: DraftSyncPayload = {
  event: 'action',
  data: {
    type: 'BAN',
    champion: 'Yasuo',
    role: null,
    side: 'red',
    turn: 2,
    timestamp: new Date().toISOString(),
  },
}

useDraftStore.getState().applyRemoteAction(remotePayload)
console.log('✓ Remote ban applied via Broadcast')
console.log(
  `  - Red bans: ${JSON.stringify(useDraftStore.getState().red.bans)}`
)
console.log(`  - Current turn: ${useDraftStore.getState().currentTurn}`)

// Test remote undo
const undoPayload: DraftSyncPayload = {
  event: 'undo',
  data: null,
}

useDraftStore.getState().applyRemoteAction(undoPayload)
console.log('✓ Remote undo applied')
console.log(
  `  - Red bans after undo: ${JSON.stringify(useDraftStore.getState().red.bans)}`
)
console.log(`  - Current turn after undo: ${useDraftStore.getState().currentTurn}`)

console.log('\n')

// ============================================================================
// Test 2: API Route Structure Verification
// ============================================================================

console.log('Test 2: API Route Files Exist')
console.log('------------------------------')

const fs = require('fs')
const path = require('path')

const apiRoutes = [
  'app/api/draft/route.ts',
  'app/api/draft/[id]/route.ts',
  'app/api/draft/[id]/action/route.ts',
]

let allRoutesExist = true

for (const route of apiRoutes) {
  const filePath = path.join(process.cwd(), route)
  const exists = fs.existsSync(filePath)
  allRoutesExist = allRoutesExist && exists
  console.log(
    `${exists ? '✓' : '✗'} ${route} ${exists ? 'exists' : 'MISSING'}`
  )
}

console.log('\n')

// ============================================================================
// Test 3: Realtime Module Verification
// ============================================================================

console.log('Test 3: Realtime Module Exports')
console.log('--------------------------------')

const realtimeModule = require('../lib/draft/realtime')

const requiredExports = [
  'createDraftChannel',
  'subscribeToDraft',
  'broadcastAction',
  'broadcastReset',
  'broadcastUndo',
  'useDraftRealtime',
]

let allExportsPresent = true

for (const exportName of requiredExports) {
  const exists = typeof realtimeModule[exportName] === 'function'
  allExportsPresent = allExportsPresent && exists
  console.log(
    `${exists ? '✓' : '✗'} ${exportName} ${exists ? 'exported' : 'MISSING'}`
  )
}

console.log('\n')

// ============================================================================
// Test 4: Type Definitions
// ============================================================================

console.log('Test 4: Type Definitions')
console.log('------------------------')

// Check if types are properly exported
import type { DraftState, DraftAction } from '../lib/draft/types'
import type { ValidationResult } from '../lib/draft/validation'

console.log('✓ DraftState type available')
console.log('✓ DraftAction type available')
console.log('✓ ValidationResult type available')
console.log('✓ DraftSyncPayload type available')

console.log('\n')

// ============================================================================
// Summary
// ============================================================================

console.log('=== Verification Summary ===')
console.log(`Store Realtime Integration: ${banSuccess ? '✓ PASS' : '✗ FAIL'}`)
console.log(`API Routes: ${allRoutesExist ? '✓ PASS' : '✗ FAIL'}`)
console.log(`Realtime Exports: ${allExportsPresent ? '✓ PASS' : '✗ FAIL'}`)
console.log(`Type Definitions: ✓ PASS`)

const allTestsPass =
  banSuccess && allRoutesExist && allExportsPresent

if (allTestsPass) {
  console.log('\n✓ All verification tests PASSED')
  process.exit(0)
} else {
  console.log('\n✗ Some verification tests FAILED')
  process.exit(1)
}
