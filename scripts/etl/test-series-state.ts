/**
 * Quick test of GRID Series State API
 * Tests a known series ID to see if API is responsive
 */

import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

const GRID_API_KEY = process.env.GRID_API_KEY!
const SERIES_STATE_API = 'https://api-op.grid.gg/live-data-feed/series-state/graphql'

// Test with a known series ID from LCK Spring 2024
const TEST_SERIES_ID = '2616371' // NONGSHIM RED FORCE vs DRX from ETL output

async function testSeriesStateAPI() {
  console.log('Testing GRID Series State API...\n')
  console.log(`Series ID: ${TEST_SERIES_ID}`)
  console.log(`API: ${SERIES_STATE_API}\n`)

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.log('⏱️  Request timeout after 30 seconds')
    controller.abort()
  }, 30000)

  try {
    console.log('🔄 Sending request...')
    const startTime = Date.now()

    const res = await fetch(SERIES_STATE_API, {
      method: 'POST',
      headers: {
        'x-api-key': GRID_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query($id: ID!) {
          seriesState(id: $id) {
            id
            started
            finished
          }
        }`,
        variables: { id: TEST_SERIES_ID },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`✅ Response received in ${elapsed}s`)
    console.log(`   Status: ${res.status} ${res.statusText}`)

    if (!res.ok) {
      const text = await res.text()
      console.error(`❌ Error response: ${text}`)
      return
    }

    const data = await res.json()

    if (data.errors?.length) {
      console.error('❌ GraphQL errors:', JSON.stringify(data.errors, null, 2))
      return
    }

    if (data.data?.seriesState) {
      console.log('✅ Series state found!')
      console.log('   Data:', JSON.stringify(data.data.seriesState, null, 2))
    } else {
      console.log('⚠️  No series state (might not be finished yet)')
      console.log('   Response:', JSON.stringify(data, null, 2))
    }
  } catch (e) {
    clearTimeout(timeout)
    if ((e as Error).name === 'AbortError') {
      console.error('❌ Request aborted (timeout)')
    } else {
      console.error('❌ Error:', (e as Error).message)
      console.error('   Stack:', (e as Error).stack)
    }
  }
}

testSeriesStateAPI()
