/**
 * GRID API Client for League of Legends ETL
 * Supports all three GRID APIs:
 * - Central Data API (tournament/series metadata)
 * - Series State API (post-match picks/bans data)
 * - File Download API (event timeline files - not used for LoL drafts)
 */

import Bottleneck from 'bottleneck'
import pRetry from 'p-retry'

// API Endpoints
const GRID_CENTRAL_API = 'https://api-op.grid.gg/central-data/graphql'
const GRID_SERIES_STATE_API = 'https://api-op.grid.gg/live-data-feed/series-state/graphql'
const GRID_FILE_API = 'https://api.grid.gg/file-download/list'

// Rate limits - matching lumina's configuration
// GRID API official limits: 180 req/min (3 req/sec)
const RATE_LIMITS = {
  maxConcurrent: 3,      // Allow 3 simultaneous requests
  minTime: 333,          // 333ms between requests (3 req/sec = 180 req/min)
  reservoir: 180,        // Max requests per minute
  reservoirRefreshAmount: 180,
  reservoirRefreshInterval: 60 * 1000,
}

// ==========================================
// LOL TOURNAMENT IDS (from hackathon access)
// ==========================================

export const LOL_TOURNAMENTS: Record<string, { id: string; region: string }> = {
  // LCK
  'LCK - Regional Qualifier 2024': { id: '775192', region: 'lck' },
  'LCK - Spring 2024': { id: '758024', region: 'lck' },
  'LCK - Summer 2024': { id: '774794', region: 'lck' },
  'LCK - Split 2 2025': { id: '825490', region: 'lck' },
  'LCK - Split 3 2025': { id: '826679', region: 'lck' },
  'LCK - LCK Cup 2025': { id: '775623', region: 'lck' },

  // LCS
  'LCS - Spring 2024': { id: '758043', region: 'lcs' },
  'LCS - Summer 2024': { id: '774888', region: 'lcs' },

  // LEC
  'LEC - Spring 2024': { id: '758077', region: 'lec' },
  'LEC - Summer 2024': { id: '774622', region: 'lec' },
  'LEC - Winter 2024': { id: '758041', region: 'lec' },
  'LEC - Season Finals 2024': { id: '775075', region: 'lec' },
  'LEC - Spring 2025': { id: '825468', region: 'lec' },
  'LEC - Summer 2025': { id: '826906', region: 'lec' },
  'LEC - Winter 2025': { id: '775513', region: 'lec' },

  // LPL
  'LPL - Regional Qualifier 2024': { id: '775167', region: 'lpl' },
  'LPL - Spring 2024': { id: '758054', region: 'lpl' },
  'LPL - Summer 2024': { id: '774845', region: 'lpl' },
  'LPL - Split 1 2025': { id: '775662', region: 'lpl' },
  'LPL - Split 2 2025': { id: '825450', region: 'lpl' },
  'LPL - Split 3 2025': { id: '826789', region: 'lpl' },

  // LTA
  'LTA North - Split 1 2025': { id: '775631', region: 'lta' },
  'LTA North - Split 2 2025': { id: '825567', region: 'lta' },
  'LTA North - Split 3 2025': { id: '826763', region: 'lta' },
  'LTA South - Split 1 2025': { id: '775636', region: 'lta' },
  'LTA South - Split 2 2025': { id: '825600', region: 'lta' },
  'LTA South - Split 3 2025': { id: '826775', region: 'lta' },
  'LTA Cross-Conference - Split 1 2025': { id: '775878', region: 'lta' },
  'LTA Cross-Conference - Regional Championship 2025': { id: '826782', region: 'lta' },
}

// ==========================================
// TYPES
// ==========================================

export interface Tournament {
  id: string
  name: string
  startDate?: string
  endDate?: string
  region?: string
}

export interface Team {
  id: string
  name: string
}

export interface Player {
  id: string
  name: string
  characterName?: string  // Champion name
  role?: string
}

export interface Series {
  id: string
  startTimeScheduled?: string
  format?: { name: string }
  tournament: { id: string; name: string }
  teams: Array<{ baseInfo: Team }>
}

export interface SeriesStateTeam {
  id: string
  name: string
  won?: boolean
  score?: number
  players?: Player[]
  characterBans?: string[]  // Champion bans
}

export interface SeriesStateGame {
  id: string
  sequenceNumber: number
  teams: SeriesStateTeam[]
  finished?: boolean
}

export interface SeriesState {
  id: string
  started?: string
  finished?: string
  teams: SeriesStateTeam[]
  games: SeriesStateGame[]
}

export interface FileInfo {
  id: string
  fileName: string
  fullURL?: string
}

// ==========================================
// GRID API CLIENT
// ==========================================

export class GridAPIClient {
  private limiter: Bottleneck
  private apiKey: string
  private stats = { requests: 0, errors: 0, downloads: 0 }

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('GRID_API_KEY is required')
    this.apiKey = apiKey

    this.limiter = new Bottleneck({
      maxConcurrent: RATE_LIMITS.maxConcurrent,
      minTime: RATE_LIMITS.minTime,
      reservoir: RATE_LIMITS.reservoir,
      reservoirRefreshAmount: RATE_LIMITS.reservoirRefreshAmount,
      reservoirRefreshInterval: RATE_LIMITS.reservoirRefreshInterval,
    })

    this.limiter.on('depleted', () => console.log('  [rate-limit] Waiting...'))
  }

  getStats() { return this.stats }

  private async query<T>(endpoint: string, gql: string, variables: Record<string, unknown> = {}): Promise<T> {
    const apiName = endpoint.includes('series-state') ? 'SeriesState' : 'CentralData'
    console.log(`    [${apiName}] Queuing request (rate-limited)...`)

    return this.limiter.schedule(() =>
      pRetry(
        async () => {
          console.log(`    [${apiName}] Executing request...`)
          this.stats.requests++

          // Add timeout to prevent infinite hangs
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'x-api-key': this.apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: gql, variables }),
              signal: controller.signal,
            })

            if (res.status === 429) {
              clearTimeout(timeout)
              console.log('  [rate-limit] 429 - Waiting 60s...')
              await new Promise(r => setTimeout(r, 60000))
              throw new Error('Rate limit')
            }
            if (!res.ok) {
              clearTimeout(timeout)
              this.stats.errors++
              throw new Error(`HTTP ${res.status}`)
            }

            console.log(`    [${apiName}] Response received, parsing...`)
            const data = await res.json()
            clearTimeout(timeout) // ✅ Clear timeout AFTER parsing completes

            if (data.errors?.length) {
              this.stats.errors++
              throw new Error(data.errors[0].message)
            }
            console.log(`    [${apiName}] Request complete`)
            return data.data as T
          } catch (e) {
            clearTimeout(timeout)
            if ((e as Error).name === 'AbortError') {
              console.log(`    [${apiName}] Request timeout after 10s`)
              throw new Error('Request timeout')
            }
            throw e
          }
        },
        { retries: 5, factor: 2, minTimeout: 5000, maxTimeout: 60000 }
      )
    )
  }

  // ==========================================
  // CENTRAL DATA API
  // ==========================================

  /** Get tournament by ID */
  async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const result = await this.query<{ tournament: Tournament | null }>(
        GRID_CENTRAL_API,
        `query($id: ID!) {
          tournament(id: $id) {
            id
            name
            startDate
            endDate
          }
        }`,
        { id: tournamentId }
      )
      return result.tournament
    } catch (e) {
      console.error(`  [error] Tournament ${tournamentId}: ${(e as Error).message}`)
      return null
    }
  }

  /** Get series for a tournament (with pagination) */
  async getSeriesForTournament(tournamentId: string, cursor?: string): Promise<{
    series: Series[]
    hasNext: boolean
    endCursor?: string
    total: number
  }> {
    try {
      const result = await this.query<{
        allSeries: {
          edges: Array<{ node: Series; cursor: string }>
          pageInfo: { hasNextPage: boolean; endCursor: string }
          totalCount: number
        }
      }>(GRID_CENTRAL_API, `
        query($tid: ID!, $after: String) {
          allSeries(
            filter: { tournament: { id: { in: [$tid] }, includeChildren: { equals: true } } }
            first: 50
            after: $after
            orderBy: StartTimeScheduled
          ) {
            edges {
              node {
                id
                startTimeScheduled
                format { name }
                tournament { id name }
                teams { baseInfo { id name } }
              }
              cursor
            }
            pageInfo { hasNextPage endCursor }
            totalCount
          }
        }
      `, { tid: tournamentId, after: cursor })

      console.log(`  [debug] Tournament ${tournamentId}: totalCount=${result.allSeries.totalCount}, edges=${result.allSeries.edges.length}`)

      return {
        series: result.allSeries.edges.map(e => e.node),
        hasNext: result.allSeries.pageInfo.hasNextPage,
        endCursor: result.allSeries.pageInfo.endCursor,
        total: result.allSeries.totalCount,
      }
    } catch (e) {
      console.error(`  [error] getSeriesForTournament(${tournamentId}): ${(e as Error).message}`)
      this.stats.errors++
      return {
        series: [],
        hasNext: false,
        endCursor: undefined,
        total: 0,
      }
    }
  }

  // ==========================================
  // SERIES STATE API (Post-match data with picks/bans)
  // ==========================================

  /** Get detailed series state (games, players, picks, bans) */
  async getSeriesState(seriesId: string): Promise<SeriesState | null> {
    try {
      const result = await this.query<{ seriesState: SeriesState | null }>(
        GRID_SERIES_STATE_API,
        `query($id: ID!) {
          seriesState(id: $id) {
            id
            started
            finished
            teams {
              id
              name
              won
              __typename
            }
            games {
              id
              sequenceNumber
              __typename
              teams {
                id
                name
                won
                score
                __typename
                players {
                  id
                  name
                  __typename
                }
              }
            }
          }
        }`,
        { id: seriesId }
      )
      return result.seriesState
    } catch (e) {
      console.error(`  [error] SeriesState ${seriesId}: ${(e as Error).message}`)
      return null
    }
  }

  // ==========================================
  // FILE DOWNLOAD API (Event timelines)
  // ==========================================

  /** Get list of available files for a series */
  async getSeriesFiles(seriesId: string): Promise<FileInfo[]> {
    return this.limiter.schedule(() =>
      pRetry(
        async () => {
          this.stats.requests++
          const res = await fetch(`${GRID_FILE_API}/${seriesId}`, {
            headers: { 'x-api-key': this.apiKey },
          })

          if (res.status === 429) {
            await new Promise(r => setTimeout(r, 60000))
            throw new Error('Rate limit')
          }
          if (res.status === 404) return []  // No files available
          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          const data = await res.json()
          return (data.files || []) as FileInfo[]
        },
        { retries: 3, minTimeout: 2000 }
      )
    )
  }

  /** Download and decompress events file for a series */
  async downloadEventsFile(seriesId: string, outputDir: string): Promise<string | null> {
    const files = await this.getSeriesFiles(seriesId)

    // Find the events file (id contains 'events')
    const eventsFile = files.find(f =>
      f.id?.toLowerCase().includes('events') ||
      f.fileName?.toLowerCase().includes('events')
    )

    if (!eventsFile?.fullURL) {
      return null
    }

    const { mkdir } = await import('fs/promises')
    const path = await import('path')

    await mkdir(outputDir, { recursive: true })
    const outputPath = path.join(outputDir, `${seriesId}_events.jsonl`)

    return this.limiter.schedule(() =>
      pRetry(
        async () => {
          this.stats.downloads++
          const res = await fetch(eventsFile.fullURL!, {
            headers: { 'x-api-key': this.apiKey },
          })

          if (!res.ok) throw new Error(`Download failed: ${res.status}`)
          if (!res.body) throw new Error('No response body')

          // Read buffer to detect compression format
          const arrayBuffer = await res.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          let content: Buffer

          // Check magic bytes for compression
          if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
            // GZIP format
            const { gunzipSync } = await import('zlib')
            content = gunzipSync(buffer)
          } else if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
            // ZIP format (requires adm-zip package)
            const AdmZip = (await import('adm-zip')).default
            const zip = new AdmZip(buffer)
            const entries = zip.getEntries()
            const jsonlEntry = entries.find(e => e.entryName.endsWith('.jsonl'))
            if (!jsonlEntry) throw new Error('No JSONL in ZIP')
            content = jsonlEntry.getData()
          } else {
            // Raw JSONL
            content = buffer
          }

          // Write to file
          const { writeFile } = await import('fs/promises')
          await writeFile(outputPath, content)

          return outputPath
        },
        { retries: 3, minTimeout: 2000 }
      )
    )
  }

  /** Download and parse end_state file for picks/bans */
  async getEndState(seriesId: string): Promise<any | null> {
    const files = await this.getSeriesFiles(seriesId)

    // Find the end_state file
    const endStateFile = files.find(f =>
      f.id?.toLowerCase().includes('state') ||
      f.fileName?.toLowerCase().includes('end_state')
    )

    if (!endStateFile?.fullURL) {
      console.log(`  [warn] No end_state file for series ${seriesId}`)
      return null
    }

    return this.limiter.schedule(() =>
      pRetry(
        async () => {
          this.stats.downloads++
          const res = await fetch(endStateFile.fullURL!, {
            headers: { 'x-api-key': this.apiKey },
          })

          if (!res.ok) throw new Error(`Download failed: ${res.status}`)

          const data = await res.json()
          return data
        },
        { retries: 3, minTimeout: 2000 }
      )
    )
  }

  async disconnect() { await this.limiter.disconnect() }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/** Get tournaments by region filter */
export function getTournamentsByRegion(region?: string): Array<{ name: string; id: string; region: string }> {
  return Object.entries(LOL_TOURNAMENTS)
    .filter(([_, t]) => !region || t.region === region.toLowerCase())
    .map(([name, t]) => ({ name, id: t.id, region: t.region }))
}

/** Get tournament by name */
export function getTournamentByName(name: string): { id: string; region: string } | undefined {
  return LOL_TOURNAMENTS[name]
}
