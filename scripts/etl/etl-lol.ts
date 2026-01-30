/**
 * League of Legends ETL - Comprehensive data fetch from GRID.gg
 *
 * Fetches:
 * - Tournaments, Teams, Series (metadata from Central Data API)
 * - Games, Players, Drafts (picks/bans from Series State API)
 *
 * Usage: pnpm etl [options]
 *   --dry-run         Don't insert data into database
 *   --region=REGION   Filter by region (lck, lcs, lec, lpl, lta)
 *   --tournament=NAME Filter by tournament name
 *   --series-limit=N  Process only first N series
 */

import { config } from 'dotenv'
import path from 'path'

// Load env from project root
config({ path: path.resolve(process.cwd(), '../../.env.local') })
config({ path: path.resolve(process.cwd(), '.env') })

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  GridAPIClient,
  getTournamentsByRegion,
  LOL_TOURNAMENTS,
  Tournament,
  Series,
  SeriesState,
} from './grid-client.js'
import { inferRole, mapGridRole, Role } from './role-inference.js'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GRID_API_KEY = process.env.GRID_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !GRID_API_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GRID_API_KEY')
  process.exit(1)
}

// CLI flags
const dryRun = process.argv.includes('--dry-run')
const regionArg = process.argv.find(a => a.startsWith('--region='))
const regionFilter = regionArg?.split('=')[1]?.toLowerCase()
const tournamentArg = process.argv.find(a => a.startsWith('--tournament='))
const tournamentFilter = tournamentArg?.split('=')[1]
const seriesLimitArg = process.argv.find(a => a.startsWith('--series-limit='))
const seriesLimit = seriesLimitArg ? parseInt(seriesLimitArg.split('=')[1]) : undefined

// Stats
const stats = {
  tournaments: 0,
  series: 0,
  teams: new Set<string>(),
  players: new Set<string>(),
  games: 0,
  drafts: 0,
  picks: 0,
  bans: 0,
  roleInference: { high: 0, medium: 0, low: 0 },
  errors: 0,
}

// ==========================================
// DATABASE OPERATIONS (synapse schema)
// ==========================================

async function upsertTournament(supabase: SupabaseClient, t: { id: string; name: string; region?: string; startDate?: string; endDate?: string }) {
  if (dryRun) return null

  const { data, error } = await supabase
    .schema('synapse')
    .from('tournaments')
    .upsert({
      grid_id: t.id,
      title: t.name,
      region: t.region,
      start_date: t.startDate,
      end_date: t.endDate,
    }, { onConflict: 'grid_id' })
    .select('id')
    .single()

  if (error) { stats.errors++; console.error(`  [error] Tournament: ${error.message}`) }
  return data?.id || null
}

async function upsertTeam(supabase: SupabaseClient, team: { id: string; name: string }): Promise<string | null> {
  if (dryRun || !team.name) return null
  stats.teams.add(team.id)

  const { data, error } = await supabase
    .schema('synapse')
    .from('teams')
    .upsert({
      grid_id: team.id,
      name: team.name,
    }, { onConflict: 'grid_id' })
    .select('id')
    .single()

  if (error && !error.message.includes('duplicate')) {
    console.error(`  [error] Team: ${error.message}`)
  }
  return data?.id || null
}

async function upsertPlayer(supabase: SupabaseClient, player: {
  id: string
  name: string
  teamDbId?: string | null
  role?: Role
}): Promise<string | null> {
  if (dryRun || !player.name) return null
  stats.players.add(player.id)

  const { data, error } = await supabase
    .schema('synapse')
    .from('players')
    .upsert({
      grid_id: player.id,
      name: player.name,
      team_id: player.teamDbId,
      primary_role: player.role || 'mid',
    }, { onConflict: 'grid_id' })
    .select('id')
    .single()

  if (error && !error.message.includes('duplicate')) {
    console.error(`  [error] Player: ${error.message}`)
  }
  return data?.id || null
}

async function upsertSeries(supabase: SupabaseClient, s: {
  gridId: string
  tournamentDbId: string | null
  blueTeamDbId: string | null
  redTeamDbId: string | null
  winnerTeamDbId: string | null
  startedAt?: string
  finishedAt?: string
}): Promise<string | null> {
  if (dryRun) return null

  const { data, error } = await supabase
    .schema('synapse')
    .from('series')
    .upsert({
      grid_id: s.gridId,
      tournament_id: s.tournamentDbId,
      blue_team_id: s.blueTeamDbId,
      red_team_id: s.redTeamDbId,
      winner_team_id: s.winnerTeamDbId,
      started_at: s.startedAt,
      finished_at: s.finishedAt,
    }, { onConflict: 'grid_id' })
    .select('id')
    .single()

  if (error) { stats.errors++; console.error(`  [error] Series: ${error.message}`) }
  return data?.id || null
}

async function upsertGame(supabase: SupabaseClient, game: {
  gridId: string
  seriesDbId: string | null
  gameNumber: number
  blueTeamWon?: boolean
  durationSeconds?: number
}): Promise<string | null> {
  if (dryRun) return null
  stats.games++

  const { data, error } = await supabase
    .schema('synapse')
    .from('games')
    .upsert({
      grid_id: game.gridId,
      series_id: game.seriesDbId,
      game_number: game.gameNumber,
      blue_team_won: game.blueTeamWon,
      duration_seconds: game.durationSeconds,
    }, { onConflict: 'grid_id' })
    .select('id')
    .single()

  if (error) { stats.errors++; console.error(`  [error] Game: ${error.message}`) }
  return data?.id || null
}

async function upsertDraft(supabase: SupabaseClient, draft: {
  gameDbId: string
  blueBans: string[]
  redBans: string[]
}): Promise<string | null> {
  if (dryRun) return null
  stats.drafts++
  stats.bans += draft.blueBans.length + draft.redBans.length

  const { data, error } = await supabase
    .schema('synapse')
    .from('drafts')
    .upsert({
      game_id: draft.gameDbId,
      blue_bans: draft.blueBans,
      red_bans: draft.redBans,
    }, { onConflict: 'game_id' })
    .select('id')
    .single()

  if (error) { stats.errors++; console.error(`  [error] Draft: ${error.message}`) }
  return data?.id || null
}

async function insertChampionPick(supabase: SupabaseClient, pick: {
  draftDbId: string
  playerDbId: string | null
  teamSide: 'blue' | 'red'
  championName: string
  role: Role
  roleConfidence: number
  pickOrder: number
}) {
  if (dryRun) return
  stats.picks++

  // Track confidence stats
  if (pick.roleConfidence > 0.9) stats.roleInference.high++
  else if (pick.roleConfidence >= 0.5) stats.roleInference.medium++
  else stats.roleInference.low++

  const { error } = await supabase
    .schema('synapse')
    .from('champion_picks')
    .insert({
      draft_id: pick.draftDbId,
      player_id: pick.playerDbId,
      team_side: pick.teamSide,
      champion_name: pick.championName,
      role: pick.role,
      role_confidence: pick.roleConfidence,
      pick_order: pick.pickOrder,
    })

  if (error && !error.message.includes('duplicate')) {
    stats.errors++
    console.error(`  [error] ChampionPick: ${error.message}`)
  }
}

// ==========================================
// MAIN ETL
// ==========================================

async function runETL() {
  console.log('========================================')
  console.log('League of Legends ETL - GRID.gg to Supabase')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (regionFilter) console.log(`Region Filter: ${regionFilter.toUpperCase()}`)
  if (tournamentFilter) console.log(`Tournament Filter: ${tournamentFilter}`)
  if (seriesLimit) console.log(`Series Limit: ${seriesLimit}`)
  console.log('========================================\n')

  const grid = new GridAPIClient(GRID_API_KEY!)
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

  // Step 1: Get tournaments to process
  console.log('Step 1: Getting tournaments...')
  let tournamentsToProcess = getTournamentsByRegion(regionFilter)

  // Apply tournament name filter if specified
  if (tournamentFilter) {
    tournamentsToProcess = tournamentsToProcess.filter(t =>
      t.name.toLowerCase().includes(tournamentFilter.toLowerCase())
    )
  }

  console.log(`Found ${tournamentsToProcess.length} tournaments to process\n`)

  // Step 2: Collect all series from tournaments
  console.log('Step 2: Collecting series from tournaments...')
  const allSeries: { series: Series; tournamentId: string; tournamentDbId: string | null; region: string }[] = []

  for (const tournament of tournamentsToProcess) {
    console.log(`  [${tournament.id}] ${tournament.name}`)
    stats.tournaments++

    // Get tournament details from API
    const tournamentDetails = await grid.getTournament(tournament.id)

    // Upsert tournament
    const tournamentDbId = await upsertTournament(supabase, {
      id: tournament.id,
      name: tournament.name,
      region: tournament.region,
      startDate: tournamentDetails?.startDate,
      endDate: tournamentDetails?.endDate,
    })

    // Get series with pagination
    let cursor: string | undefined
    let seriesCount = 0
    do {
      const result = await grid.getSeriesForTournament(tournament.id, cursor)
      for (const series of result.series) {
        allSeries.push({
          series,
          tournamentId: tournament.id,
          tournamentDbId,
          region: tournament.region,
        })

        // Skip team upserts here - they'll be upserted during series processing
        seriesCount++
      }
      cursor = result.hasNext ? result.endCursor : undefined
    } while (cursor)

    console.log(`    -> ${seriesCount} series`)
  }

  console.log(`\nCollected ${allSeries.length} total series\n`)

  // Apply series limit if specified
  const seriesToProcess = seriesLimit ? allSeries.slice(0, seriesLimit) : allSeries

  // Step 3: Process each series (Series State API for picks/bans)
  console.log(`Step 3: Processing ${seriesToProcess.length} series (detailed data)...\n`)

  for (let i = 0; i < seriesToProcess.length; i++) {
    const { series, tournamentDbId, region } = seriesToProcess[i]
    const progress = `[${i + 1}/${seriesToProcess.length}]`
    stats.series++

    // Get team names for display
    const teamA = series.teams[0]?.baseInfo?.name || 'TBD'
    const teamB = series.teams[1]?.baseInfo?.name || 'TBD'
    console.log(`${progress} Series ${series.id}: ${teamA} vs ${teamB}`)
    console.log(`  -> Fetching series state from GRID...`)

    // Get Series State (games metadata)
    const seriesState = await grid.getSeriesState(series.id)

    console.log(`  -> Series state received: ${seriesState?.games?.length || 0} games`)

    if (!seriesState) {
      console.log(`  -> No Series State available`)
      continue
    }

    // Get end_state file (picks/bans data)
    console.log(`  -> Downloading end_state file...`)
    const endState = await grid.getEndState(series.id)

    if (!endState) {
      console.log(`  -> No end_state file available, skipping`)
      continue
    }

    console.log(`  -> end_state received: ${endState.seriesState?.draftActions?.length || 0} draft actions`)

    // Show what data we got
    console.log(`  -> Series details:`)
    console.log(`     - Started: ${seriesState.started || 'N/A'}`)
    console.log(`     - Finished: ${seriesState.finished || 'N/A'}`)
    console.log(`     - Teams: ${seriesState.teams?.length || 0}`)
    console.log(`     - Games: ${seriesState.games?.length || 0}`)
    console.log(`     - Draft actions: ${endState.seriesState?.draftActions?.length || 0}`)

    // Get team DB IDs
    const blueTeamDbId = series.teams[0]?.baseInfo
      ? await upsertTeam(supabase, series.teams[0].baseInfo)
      : null
    const redTeamDbId = series.teams[1]?.baseInfo
      ? await upsertTeam(supabase, series.teams[1].baseInfo)
      : null

    // Determine winner
    const winnerGridId = seriesState.teams.find(t => t.won)?.id
    let winnerTeamDbId: string | null = null
    if (winnerGridId) {
      const { data } = await supabase
        .schema('synapse')
        .from('teams')
        .select('id')
        .eq('grid_id', winnerGridId)
        .single()
      winnerTeamDbId = data?.id || null
    }

    // Upsert series (use timestamps from endState, not booleans from seriesState)
    const seriesDbId = await upsertSeries(supabase, {
      gridId: series.id,
      tournamentDbId,
      blueTeamDbId,
      redTeamDbId,
      winnerTeamDbId,
      startedAt: endState.seriesState?.startedAt,
      finishedAt: endState.seriesState?.finishedAt,  // Use finishedAt if available, otherwise null
    })

    // Parse end_state structure for picks/bans
    // Structure: endState.seriesState.games[] with draftActions and player data
    const endStateGames = endState.seriesState?.games || []

    // Process games
    let gamesProcessed = 0
    let picksProcessed = 0

    for (const game of seriesState.games || []) {
      const gameBlue = game.teams[0]
      const gameRed = game.teams[1]
      const gameWinner = game.teams.find(t => t.won)

      // Upsert game
      const gameDbId = await upsertGame(supabase, {
        gridId: game.id,
        seriesDbId,
        gameNumber: game.sequenceNumber,
        blueTeamWon: gameWinner?.id === gameBlue?.id,
      })

      if (!gameDbId) continue
      gamesProcessed++

      // Find corresponding end_state game data
      const endStateGame = endStateGames.find((eg: any) => eg.sequenceNumber === game.sequenceNumber)

      if (!endStateGame) {
        console.log(`       ⚠️  No end_state data for game ${game.sequenceNumber}`)
        continue
      }

      // Extract draft actions for this game
      const draftActions = endStateGame.draftActions || []
      const blueBans: string[] = []
      const redBans: string[] = []
      const bluePicks: Array<{ championName: string; playerId: string; playerName: string; sequenceNumber: number }> = []
      const redPicks: Array<{ championName: string; playerId: string; playerName: string; sequenceNumber: number }> = []

      // Determine which team is blue/red by matching grid IDs
      const blueTeamGridId = series.teams[0]?.baseInfo?.id
      const redTeamGridId = series.teams[1]?.baseInfo?.id

      // Parse draft actions
      for (const action of draftActions) {
        const championName = action.draftable?.name
        const drafterTeamId = action.drafter?.id
        const actionType = action.type

        if (!championName) continue

        const isBlueTeam = drafterTeamId === blueTeamGridId

        if (actionType === 'ban') {
          if (isBlueTeam) {
            blueBans.push(championName)
          } else {
            redBans.push(championName)
          }
        } else if (actionType === 'pick') {
          // For picks, find the team and then the player who picked this champion
          const team = endStateGame.teams?.find((t: any) => t.id === drafterTeamId)
          if (!team) continue

          // Find player with this champion (use character.name, not characterName)
          const player = team.players?.find((p: any) => p.character?.name === championName)

          if (player) {
            const pick = {
              championName,
              playerId: player.id,
              playerName: player.name,
              sequenceNumber: parseInt(action.sequenceNumber || '0'),
            }

            if (isBlueTeam) {
              bluePicks.push(pick)
            } else {
              redPicks.push(pick)
            }
          }
        }
      }

      console.log(`       Game ${game.sequenceNumber}: ${blueBans.length} blue bans, ${redBans.length} red bans, ${bluePicks.length} blue picks, ${redPicks.length} red picks`)

      // Upsert draft with bans
      const draftDbId = await upsertDraft(supabase, {
        gameDbId,
        blueBans,
        redBans,
      })

      if (!draftDbId) continue

      // Process blue team picks (renumber to 1-5)
      const blueAssignedRoles: Role[] = []
      const sortedBluePicks = bluePicks.sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      for (let i = 0; i < sortedBluePicks.length; i++) {
        const pick = sortedBluePicks[i]
        const playerDbId = await upsertPlayer(supabase, {
          id: pick.playerId,
          name: pick.playerName,
          teamDbId: blueTeamDbId,
          role: 'mid',  // Will be inferred below
        })

        const roleResult = inferRole({
          championName: pick.championName,
          playerPrimaryRole: undefined,  // Not available from draft actions
          assignedRoles: blueAssignedRoles,
        })
        blueAssignedRoles.push(roleResult.role)

        await insertChampionPick(supabase, {
          draftDbId,
          playerDbId,
          teamSide: 'blue',
          championName: pick.championName,
          role: roleResult.role,
          roleConfidence: roleResult.confidence,
          pickOrder: i + 1,  // Blue team: 1-5
        })
        picksProcessed++
      }

      // Process red team picks (renumber to 6-10)
      const redAssignedRoles: Role[] = []
      const sortedRedPicks = redPicks.sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      for (let i = 0; i < sortedRedPicks.length; i++) {
        const pick = sortedRedPicks[i]
        const playerDbId = await upsertPlayer(supabase, {
          id: pick.playerId,
          name: pick.playerName,
          teamDbId: redTeamDbId,
          role: 'mid',  // Will be inferred below
        })

        const roleResult = inferRole({
          championName: pick.championName,
          playerPrimaryRole: undefined,  // Not available from draft actions
          assignedRoles: redAssignedRoles,
        })
        redAssignedRoles.push(roleResult.role)

        await insertChampionPick(supabase, {
          draftDbId,
          playerDbId,
          teamSide: 'red',
          championName: pick.championName,
          role: roleResult.role,
          roleConfidence: roleResult.confidence,
          pickOrder: i + 6,  // Red team: 6-10
        })
        picksProcessed++
      }
    }

    console.log(`  -> Processed: ${gamesProcessed} games, ${picksProcessed} picks`)
  }

  await grid.disconnect()

  // Print stats
  console.log('\n========================================')
  console.log('ETL COMPLETE')
  console.log('========================================')
  console.log(`Tournaments:      ${stats.tournaments}`)
  console.log(`Series:           ${stats.series}`)
  console.log(`Teams:            ${stats.teams.size} unique`)
  console.log(`Players:          ${stats.players.size} unique`)
  console.log(`Games:            ${stats.games}`)
  console.log(`Drafts:           ${stats.drafts}`)
  console.log(`Champion Picks:   ${stats.picks}`)
  console.log(`Bans:             ${stats.bans}`)
  console.log(`\nRole Inference Quality:`)
  console.log(`  - High (>0.9):  ${stats.roleInference.high} (${((stats.roleInference.high / stats.picks) * 100).toFixed(1)}%)`)
  console.log(`  - Medium:       ${stats.roleInference.medium} (${((stats.roleInference.medium / stats.picks) * 100).toFixed(1)}%)`)
  console.log(`  - Low (<0.5):   ${stats.roleInference.low}`)
  console.log(`Errors:           ${stats.errors}`)
  console.log(`API Stats:        ${grid.getStats().requests} requests, ${grid.getStats().errors} errors`)
  console.log('========================================\n')
}

runETL().catch(e => { console.error('Fatal:', e); process.exit(1) })
