/**
 * GRID API Response Inspector
 * Shows raw JSON responses to verify data structure
 */

import { config } from 'dotenv'
import path from 'path'
import { GridAPIClient } from './grid-client.js'

config({ path: path.resolve(process.cwd(), '.env.local') })

const GRID_API_KEY = process.env.GRID_API_KEY!

// Test series ID (from LCK Spring 2024)
const TEST_SERIES_ID = '2616371' // NONGSHIM RED FORCE vs DRX
const TEST_TOURNAMENT_ID = '758024' // LCK Spring 2024

async function inspectGridResponses() {
  console.log('========================================')
  console.log('GRID API Response Inspector')
  console.log('========================================\n')

  const grid = new GridAPIClient(GRID_API_KEY)

  // 1. Inspect Tournament Response
  console.log('1️⃣  TOURNAMENT RESPONSE:\n')
  console.log(`   Fetching tournament ${TEST_TOURNAMENT_ID}...\n`)

  const tournament = await grid.getTournament(TEST_TOURNAMENT_ID)
  console.log('   Raw Response:')
  console.log(JSON.stringify(tournament, null, 2))
  console.log('\n')

  // 2. Inspect Series List Response
  console.log('2️⃣  SERIES LIST RESPONSE (first page):\n')
  console.log(`   Fetching series for tournament ${TEST_TOURNAMENT_ID}...\n`)

  const seriesPage = await grid.getSeriesForTournament(TEST_TOURNAMENT_ID)
  console.log(`   Total series: ${seriesPage.total}`)
  console.log(`   This page: ${seriesPage.series.length}`)
  console.log(`   Has next: ${seriesPage.hasNext}`)
  console.log('\n   First series sample:')
  console.log(JSON.stringify(seriesPage.series[0], null, 2))
  console.log('\n')

  // 3. Inspect Series State Response
  console.log('3️⃣  SERIES STATE RESPONSE:\n')
  console.log(`   Fetching series state for ${TEST_SERIES_ID}...\n`)

  const seriesState = await grid.getSeriesState(TEST_SERIES_ID)
  console.log('   Raw Response (full structure):')
  console.log(JSON.stringify(seriesState, null, 2))
  console.log('\n')

  // 4. Analyze Series State Structure
  if (seriesState) {
    console.log('4️⃣  SERIES STATE ANALYSIS:\n')
    console.log(`   Series ID: ${seriesState.id}`)
    console.log(`   Started: ${seriesState.started}`)
    console.log(`   Finished: ${seriesState.finished}`)
    console.log(`   Teams: ${seriesState.teams?.length || 0}`)
    console.log(`   Games: ${seriesState.games?.length || 0}\n`)

    if (seriesState.teams) {
      console.log('   Teams:')
      seriesState.teams.forEach((team, i) => {
        console.log(`     ${i + 1}. ${team.name} (ID: ${team.id})`)
        console.log(`        Won: ${team.won || false}`)
        console.log(`        Score: ${team.score || 'N/A'}`)
        console.log(`        Players: ${team.players?.length || 0}`)
        console.log(`        Bans: ${team.characterBans?.length || 0} (${team.characterBans?.join(', ') || 'none'})`)
      })
      console.log()
    }

    if (seriesState.games) {
      console.log('   Games:')
      seriesState.games.forEach((game, i) => {
        console.log(`     Game ${game.sequenceNumber}:`)
        console.log(`       ID: ${game.id}`)
        console.log(`       Finished: ${game.finished || false}`)
        console.log(`       Teams: ${game.teams?.length || 0}`)

        game.teams?.forEach((team, j) => {
          console.log(`         ${j + 1}. ${team.name}`)
          console.log(`            Won: ${team.won || false}`)
          console.log(`            Score: ${team.score || 'N/A'}`)
          console.log(`            Players: ${team.players?.length || 0}`)
          console.log(`            Bans: ${team.characterBans?.length || 0}`)

          // Show first 3 picks
          const picks = team.players
            ?.filter((p) => p.characterName)
            .slice(0, 3)
            .map((p) => `${p.name} (${p.characterName}, ${p.role || 'no role'})`)
          if (picks?.length) {
            console.log(`            Sample picks: ${picks.join(' | ')}`)
          }
        })
      })
      console.log()
    }

    // 5. Data Completeness Check
    console.log('5️⃣  DATA COMPLETENESS:\n')

    const expectedDataPoints = {
      'Series has started timestamp': !!seriesState.started,
      'Series has finished timestamp': !!seriesState.finished,
      'Has team data': (seriesState.teams?.length || 0) > 0,
      'Has game data': (seriesState.games?.length || 0) > 0,
      'All games have teams': seriesState.games?.every((g) => g.teams?.length === 2) || false,
      'All teams have players': seriesState.games?.every((g) =>
        g.teams?.every((t) => (t.players?.length || 0) > 0)
      ) || false,
      'All teams have bans': seriesState.games?.every((g) =>
        g.teams?.every((t) => (t.characterBans?.length || 0) > 0)
      ) || false,
      'All players have champions': seriesState.games?.every((g) =>
        g.teams?.every((t) => t.players?.every((p) => p.characterName))
      ) || false,
      'All players have roles': seriesState.games?.every((g) =>
        g.teams?.every((t) => t.players?.every((p) => p.role))
      ) || false,
    }

    Object.entries(expectedDataPoints).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌'
      console.log(`   ${status} ${check}`)
    })
  }

  // 6. File Download API (if available)
  console.log('\n6️⃣  FILE DOWNLOAD API:\n')
  console.log(`   Checking for event files for series ${TEST_SERIES_ID}...\n`)

  const files = await grid.getSeriesFiles(TEST_SERIES_ID)
  if (files.length > 0) {
    console.log(`   Found ${files.length} files:`)
    files.forEach((file, i) => {
      console.log(`     ${i + 1}. ${file.fileName}`)
      console.log(`        ID: ${file.id}`)
      console.log(`        URL: ${file.fullURL?.substring(0, 80)}...`)
    })
  } else {
    console.log('   ⚠️  No files available for this series')
  }

  await grid.disconnect()

  console.log('\n========================================')
  console.log('Inspection Complete!')
  console.log('========================================')
}

inspectGridResponses().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
