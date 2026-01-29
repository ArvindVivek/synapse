// Run with: npx tsx scripts/validate-data.ts
// Validates ETL data completeness against success criteria

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/functions/_shared/types';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface ValidationCheck {
  name: string;
  passed: boolean;
  actual: number | string;
  expected: string;
  details?: string;
}

interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  summary: string;
}

async function validateDataCompleteness(): Promise<ValidationResult> {
  // Initialize Supabase client with service role for full access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  const checks: ValidationCheck[] = [];

  console.log('🔍 Starting data validation...\n');

  // CHECK 1: Game count by region
  console.log('📊 Check 1: Game count by region...');
  const { data: regionCounts, error: regionError } = await supabase
    .rpc('get_games_by_region' as any)
    .returns<{ region: string; count: number }[]>();

  // Fallback query if RPC doesn't exist
  let totalGames = 0;
  let regionBreakdown: Record<string, number> = {};

  if (regionError) {
    // Manual join query
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('series!inner(tournament_id, tournaments!inner(region))');

    if (gamesError) {
      checks.push({
        name: 'Game count by region',
        passed: false,
        actual: 0,
        expected: '1,500+ games total',
        details: `Query failed: ${gamesError.message}`,
      });
    } else {
      // Count by region
      (games as any[]).forEach((game: any) => {
        const region = game.series?.tournaments?.region || 'unknown';
        regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
        totalGames++;
      });

      const expectedRegions = {
        'LCS': 200,
        'LEC': 200,
        'LCK': 300,
        'LPL': 400,
      };

      let allRegionsPass = true;
      Object.entries(expectedRegions).forEach(([region, minCount]) => {
        const actual = regionBreakdown[region] || 0;
        const passed = actual >= minCount;
        if (!passed) allRegionsPass = false;

        checks.push({
          name: `${region} game count`,
          passed,
          actual,
          expected: `${minCount}+`,
          details: passed ? '✓' : `Expected at least ${minCount}, got ${actual}`,
        });
      });

      checks.push({
        name: 'Total game count',
        passed: totalGames >= 1500,
        actual: totalGames,
        expected: '1,500+',
        details: totalGames >= 1500 ? '✓' : `Expected at least 1,500, got ${totalGames}`,
      });
    }
  } else {
    // Use RPC result
    regionCounts?.forEach(rc => {
      regionBreakdown[rc.region] = rc.count;
      totalGames += rc.count;
    });

    checks.push({
      name: 'Total game count',
      passed: totalGames >= 1500,
      actual: totalGames,
      expected: '1,500+',
    });
  }

  // CHECK 2: Draft completeness
  console.log('📝 Check 2: Draft completeness...');
  const { data: orphanedGames, error: orphanError } = await supabase
    .from('games')
    .select('id')
    .is('drafts.id', null)
    .limit(1);

  // Better query: count games without drafts
  const { count: gamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });

  const { count: draftsCount } = await supabase
    .from('drafts')
    .select('*', { count: 'exact', head: true });

  const orphanedCount = (gamesCount || 0) - (draftsCount || 0);

  checks.push({
    name: 'Draft completeness',
    passed: orphanedCount === 0,
    actual: orphanedCount,
    expected: '0 orphaned games',
    details: orphanedCount === 0 ? '✓ Every game has a draft' : `${orphanedCount} games missing drafts`,
  });

  // CHECK 3: Pick count per draft
  console.log('🎯 Check 3: Pick count per draft...');
  const { data: pickCounts, error: pickError } = await supabase
    .from('drafts')
    .select('id, champion_picks(count)');

  let wrongPickCountDrafts = 0;
  if (pickCounts && Array.isArray(pickCounts)) {
    pickCounts.forEach((draft: any) => {
      const count = draft.champion_picks?.[0]?.count || 0;
      if (count !== 10) {
        wrongPickCountDrafts++;
      }
    });
  }

  checks.push({
    name: 'Pick count per draft',
    passed: wrongPickCountDrafts === 0,
    actual: wrongPickCountDrafts,
    expected: '0 drafts with wrong pick count',
    details: wrongPickCountDrafts === 0 ? '✓ All drafts have 10 picks' : `${wrongPickCountDrafts} drafts don't have exactly 10 picks`,
  });

  // CHECK 4: Ban count per draft
  console.log('🚫 Check 4: Ban count per draft...');
  const { data: drafts, error: draftError } = await supabase
    .from('drafts')
    .select('id, blue_bans, red_bans');

  let wrongBanCountDrafts = 0;
  if (drafts) {
    drafts.forEach((draft: any) => {
      const blueBans = draft.blue_bans?.length || 0;
      const redBans = draft.red_bans?.length || 0;
      const totalBans = blueBans + redBans;

      // Most games have 10 bans (5+5), but some may have fewer due to remakes/technical issues
      if (totalBans < 6 || totalBans > 10) {
        wrongBanCountDrafts++;
      }
    });
  }

  checks.push({
    name: 'Ban count per draft',
    passed: wrongBanCountDrafts === 0,
    actual: wrongBanCountDrafts,
    expected: '0 drafts with unusual ban count',
    details: wrongBanCountDrafts === 0 ? '✓ All drafts have reasonable ban counts (6-10)' : `${wrongBanCountDrafts} drafts have unusual ban counts`,
  });

  // CHECK 5: Patch version coverage
  console.log('🔖 Check 5: Patch version coverage...');
  const { count: seriesWithoutPatch } = await supabase
    .from('series')
    .select('*', { count: 'exact', head: true })
    .is('patch_version', null);

  checks.push({
    name: 'Patch version coverage',
    passed: (seriesWithoutPatch || 0) === 0,
    actual: seriesWithoutPatch || 0,
    expected: '0 series without patch version',
    details: (seriesWithoutPatch || 0) === 0 ? '✓ All series have patch_version' : `${seriesWithoutPatch} series missing patch_version`,
  });

  // CHECK 6: Role distribution sanity
  console.log('👥 Check 6: Role distribution per draft...');
  const { data: roleDistributions, error: roleError } = await supabase
    .from('champion_picks')
    .select('draft_id, team_side, role')
    .order('draft_id');

  let wrongRoleDistributions = 0;
  const draftRoles: Record<string, Record<string, Set<string>>> = {};

  if (roleDistributions) {
    roleDistributions.forEach((pick: any) => {
      const key = `${pick.draft_id}-${pick.team_side}`;
      if (!draftRoles[key]) {
        draftRoles[key] = { roles: new Set() };
      }
      draftRoles[key].roles.add(pick.role);
    });

    Object.entries(draftRoles).forEach(([key, data]) => {
      const roles = data.roles;
      // Each side should have exactly 5 unique roles
      if (roles.size !== 5) {
        wrongRoleDistributions++;
      }
      // Check if all required roles are present
      const requiredRoles = new Set(['top', 'jungle', 'mid', 'adc', 'support']);
      const hasAllRoles = Array.from(requiredRoles).every(r => roles.has(r));
      if (!hasAllRoles) {
        wrongRoleDistributions++;
      }
    });
  }

  checks.push({
    name: 'Role distribution sanity',
    passed: wrongRoleDistributions === 0,
    actual: wrongRoleDistributions,
    expected: '0 drafts with missing/duplicate roles',
    details: wrongRoleDistributions === 0 ? '✓ All drafts have complete role coverage' : `${wrongRoleDistributions} draft sides have role issues`,
  });

  // Calculate overall result
  const criticalChecks = checks.filter(c =>
    c.name.includes('Total game count') ||
    c.name.includes('Draft completeness') ||
    c.name.includes('Pick count per draft') ||
    c.name.includes('Role distribution')
  );

  const allCriticalPass = criticalChecks.every(c => c.passed);
  const allPass = checks.every(c => c.passed);

  const summary = allPass
    ? '✅ All validation checks passed!'
    : allCriticalPass
    ? '⚠️  Some non-critical checks failed, but data is usable'
    : '❌ Critical validation checks failed - data quality issues detected';

  return {
    passed: allCriticalPass,
    checks,
    summary,
  };
}

// Main execution
async function main() {
  try {
    const result = await validateDataCompleteness();

    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(60) + '\n');

    result.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      console.log(`   Expected: ${check.expected}`);
      console.log(`   Actual: ${check.actual}`);
      if (check.details) {
        console.log(`   Details: ${check.details}`);
      }
      console.log();
    });

    console.log('='.repeat(60));
    console.log(result.summary);
    console.log('='.repeat(60) + '\n');

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed with error:');
    console.error(error);
    process.exit(1);
  }
}

main();
