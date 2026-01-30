/**
 * Quick inspection of end_state structure to verify parsing logic
 */

import { config } from 'dotenv'
import path from 'path'
import { GridAPIClient } from './grid-client.js'

config({ path: path.resolve(process.cwd(), '.env.local') })

const GRID_API_KEY = process.env.GRID_API_KEY!
const TEST_SERIES_ID = '2616371' // NONGSHIM RED FORCE vs DRX from LCK Spring 2024

async function inspectStructure() {
  console.log('Inspecting end_state structure...\n')

  const grid = new GridAPIClient(GRID_API_KEY)
  const endState = await grid.getEndState(TEST_SERIES_ID)

  if (!endState) {
    console.log('No end_state file found')
    await grid.disconnect()
    return
  }

  console.log('Top-level structure:')
  console.log(`  Keys: ${Object.keys(endState).join(', ')}\n`)

  if (endState.seriesState) {
    console.log('seriesState keys:')
    console.log(`  ${Object.keys(endState.seriesState).join(', ')}\n`)

    // Check if draftActions is at series level or game level
    if (endState.seriesState.draftActions) {
      console.log(`draftActions at series level: ${endState.seriesState.draftActions.length} actions`)
      console.log('First draft action:')
      console.log(JSON.stringify(endState.seriesState.draftActions[0], null, 2))
      console.log()
    }

    // Check games structure
    if (endState.seriesState.games) {
      console.log(`Games: ${endState.seriesState.games.length}`)
      const game = endState.seriesState.games[0]
      console.log('\nFirst game keys:')
      console.log(`  ${Object.keys(game).join(', ')}\n`)

      if (game.draftActions) {
        console.log(`draftActions at game level: ${game.draftActions.length} actions`)
        console.log('First game draft action:')
        console.log(JSON.stringify(game.draftActions[0], null, 2))
        console.log()
      }

      if (game.teams) {
        console.log(`Teams in game: ${game.teams.length}`)
        const team = game.teams[0]
        console.log('\nFirst team keys:')
        console.log(`  ${Object.keys(team).join(', ')}\n`)

        if (team.players) {
          console.log(`Players: ${team.players.length}`)
          const player = team.players[0]
          console.log('\nFirst player:')
          console.log(JSON.stringify(player, null, 2))
        }
      }
    }
  }

  await grid.disconnect()
}

inspectStructure().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
