/**
 * Fix Player Roles
 *
 * Updates player primary_role based on their most frequently inferred role from champion_picks.
 * Run this to fix existing data where all players have 'mid' as their role.
 *
 * Usage: npx tsx scripts/etl/fix-player-roles.ts
 */

import { config } from 'dotenv'
import path from 'path'

// Load env from project root
config({ path: path.resolve(process.cwd(), '.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function fixPlayerRoles() {
  console.log('========================================')
  console.log('Fix Player Roles from Champion Picks')
  console.log('========================================\n')

  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

  // Get all champion picks with player info
  console.log('Fetching champion picks...')
  const { data: picks, error: picksError } = await supabase
    .schema('synapse')
    .from('champion_picks')
    .select('player_id, role')

  if (picksError) {
    console.error('Failed to fetch champion picks:', picksError.message)
    process.exit(1)
  }

  console.log(`Found ${picks?.length || 0} champion picks`)

  // Count roles per player
  const playerRoleCounts = new Map<string, Map<string, number>>()
  for (const pick of picks || []) {
    if (!pick.player_id || !pick.role) continue

    if (!playerRoleCounts.has(pick.player_id)) {
      playerRoleCounts.set(pick.player_id, new Map())
    }
    const roleCounts = playerRoleCounts.get(pick.player_id)!
    roleCounts.set(pick.role, (roleCounts.get(pick.role) || 0) + 1)
  }

  console.log(`Found ${playerRoleCounts.size} unique players with picks\n`)

  // Determine primary role for each player (most frequent)
  let updatedCount = 0
  let errorCount = 0
  const roleDistribution: Record<string, number> = {
    top: 0,
    jungle: 0,
    mid: 0,
    adc: 0,
    support: 0,
  }

  for (const [playerId, roleCounts] of playerRoleCounts) {
    let maxCount = 0
    let primaryRole: string = 'mid'

    for (const [role, count] of roleCounts) {
      if (count > maxCount) {
        maxCount = count
        primaryRole = role
      }
    }

    roleDistribution[primaryRole] = (roleDistribution[primaryRole] || 0) + 1

    // Update player's primary_role
    const { error: updateError } = await supabase
      .schema('synapse')
      .from('players')
      .update({ primary_role: primaryRole })
      .eq('id', playerId)

    if (updateError) {
      console.error(`  [error] Failed to update player ${playerId}:`, updateError.message)
      errorCount++
    } else {
      updatedCount++
    }
  }

  console.log('========================================')
  console.log('COMPLETE')
  console.log('========================================')
  console.log(`Players updated: ${updatedCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log('\nRole distribution:')
  for (const [role, count] of Object.entries(roleDistribution)) {
    console.log(`  ${role.padEnd(8)}: ${count}`)
  }
  console.log('========================================\n')
}

fixPlayerRoles().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
