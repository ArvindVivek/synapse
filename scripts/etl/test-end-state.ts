/**
 * Test script to inspect end_state file structure
 */

import { config } from 'dotenv'
import path from 'path'
import { GridAPIClient } from './grid-client.js'

config({ path: path.resolve(process.cwd(), '.env.local') })

const GRID_API_KEY = process.env.GRID_API_KEY!
const TEST_SERIES_ID = '2616371' // NONGSHIM RED FORCE vs DRX from LCK Spring 2024

async function testEndState() {
  console.log('========================================')
  console.log('End State File Inspector')
  console.log('========================================\n')

  const grid = new GridAPIClient(GRID_API_KEY)

  console.log(`Fetching end_state for series ${TEST_SERIES_ID}...\n`)

  const endState = await grid.getEndState(TEST_SERIES_ID)

  if (!endState) {
    console.log('❌ No end_state file found')
    await grid.disconnect()
    return
  }

  console.log('✅ End state file downloaded!\n')
  console.log('📋 Full structure:\n')
  console.log(JSON.stringify(endState, null, 2))

  console.log('\n========================================')
  console.log('Analysis Complete!')
  console.log('========================================')

  await grid.disconnect()
}

testEndState().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
