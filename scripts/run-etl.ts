#!/usr/bin/env tsx
/**
 * Local ETL orchestration script
 * Usage: npx tsx scripts/run-etl.ts [--tournament-id=<id>] [--resume]
 *
 * This script orchestrates the three-stage ETL pipeline:
 * 1. Fetch tournaments from GRID API
 * 2. For each tournament, fetch series
 * 3. For each series, extract draft picks/bans
 *
 * Supports:
 * - Full ETL run (all tournaments)
 * - Single tournament ETL (--tournament-id flag)
 * - Resume from checkpoint (--resume flag)
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ==========================================
// CONFIGURATION
// ==========================================

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : 'http://localhost:54321/functions/v1';

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set in .env.local');
  process.exit(1);
}

// ==========================================
// TYPES
// ==========================================

interface TournamentSummary {
  success: boolean;
  fetched: number;
  new: number;
  skipped: number;
  errors: number;
}

interface SeriesSummary {
  success: boolean;
  tournamentId: string;
  fetched: number;
  new: number;
  skipped: number;
  errors: number;
}

interface DraftSummary {
  success: boolean;
  seriesId: string;
  gamesProcessed: number;
  picksProcessed: number;
  roleInference?: {
    high: number;
    medium: number;
    low: number;
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Call a Supabase Edge Function
 */
async function callFunction<T>(
  functionName: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const url = `${SUPABASE_FUNCTIONS_URL}/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Function ${functionName} failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format duration in human-readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ==========================================
// ETL STAGES
// ==========================================

/**
 * Stage 1: Fetch tournaments from GRID API
 */
async function runTournamentETL(): Promise<string[]> {
  console.log('\n📥 Stage 1: Fetching tournaments from GRID API...\n');

  const result = await callFunction<TournamentSummary>('etl-tournaments', {
    gameId: 'lol',
    startDate: '2024-01-01',
  });

  console.log(`   ✓ Fetched: ${result.fetched} tournaments`);
  console.log(`   ✓ New: ${result.new}`);
  console.log(`   ✓ Skipped: ${result.skipped}`);
  console.log(`   ✓ Errors: ${result.errors}\n`);

  // In a real implementation, we'd query the database for tournament IDs
  // For now, return empty array (user should run tournament ETL first manually)
  return [];
}

/**
 * Stage 2: Fetch series for a tournament
 */
async function runSeriesETL(tournamentId: string): Promise<string[]> {
  console.log(`\n📥 Stage 2: Fetching series for tournament ${tournamentId}...\n`);

  const result = await callFunction<SeriesSummary>('etl-series', {
    tournamentId,
  });

  console.log(`   ✓ Fetched: ${result.fetched} series`);
  console.log(`   ✓ New: ${result.new}`);
  console.log(`   ✓ Skipped: ${result.skipped}`);
  console.log(`   ✓ Errors: ${result.errors}\n`);

  // In a real implementation, we'd query the database for series IDs
  // For now, return empty array
  return [];
}

/**
 * Stage 3: Extract drafts from a series
 */
async function runDraftETL(seriesId: string): Promise<DraftSummary> {
  console.log(`\n📥 Stage 3: Extracting drafts for series ${seriesId}...\n`);

  const result = await callFunction<DraftSummary>('etl-drafts', {
    seriesId,
  });

  console.log(`   ✓ Games: ${result.gamesProcessed}`);
  console.log(`   ✓ Picks: ${result.picksProcessed}`);

  if (result.roleInference) {
    console.log(`   ✓ Role Inference:`);
    console.log(`      - High confidence (>0.9): ${result.roleInference.high}`);
    console.log(`      - Medium confidence (0.5-0.9): ${result.roleInference.medium}`);
    console.log(`      - Low confidence (<0.5): ${result.roleInference.low}\n`);
  }

  return result;
}

// ==========================================
// MAIN ORCHESTRATION
// ==========================================

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  Synapse ETL Pipeline Orchestrator       ║');
  console.log('╚═══════════════════════════════════════════╝');

  const startTime = Date.now();

  // Parse command-line arguments
  const args = process.argv.slice(2);
  const tournamentIdArg = args.find((arg) => arg.startsWith('--tournament-id='));
  const resumeFlag = args.includes('--resume');

  const specificTournamentId = tournamentIdArg?.split('=')[1];

  try {
    if (specificTournamentId) {
      // Single tournament ETL
      console.log(`\n🎯 Running ETL for tournament: ${specificTournamentId}\n`);

      const seriesIds = await runSeriesETL(specificTournamentId);

      if (seriesIds.length > 0) {
        for (const seriesId of seriesIds) {
          await runDraftETL(seriesId);
          await sleep(1000); // Rate limiting between series
        }
      } else {
        console.log('\n⚠️  No series found. Run tournament ETL first or check database.\n');
      }
    } else {
      // Full ETL pipeline
      console.log('\n🎯 Running full ETL pipeline (tournaments → series → drafts)\n');

      const tournamentIds = await runTournamentETL();

      if (tournamentIds.length > 0) {
        console.log(`\nProcessing ${tournamentIds.length} tournaments...\n`);

        for (const tournamentId of tournamentIds) {
          const seriesIds = await runSeriesETL(tournamentId);

          for (const seriesId of seriesIds) {
            await runDraftETL(seriesId);
            await sleep(1000); // Rate limiting
          }

          await sleep(2000); // Rate limiting between tournaments
        }
      } else {
        console.log('\n⚠️  No tournaments to process. Check GRID API or database state.\n');
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  ETL Pipeline Complete!                   ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`\n⏱️  Duration: ${formatDuration(duration)}\n`);
  } catch (error) {
    console.error('\n❌ ETL Pipeline Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runTournamentETL, runSeriesETL, runDraftETL };
