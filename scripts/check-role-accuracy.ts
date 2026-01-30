// Run with: npx tsx scripts/check-role-accuracy.ts
// Spot-checks role inference accuracy against known ground truth

import { createClient } from '@supabase/supabase-js';
import type { Database, Role } from '../supabase/functions/_shared/types';
import { config } from 'dotenv';
import path from 'path';

// Load env from parent directory (.env.local is at project root)
config({ path: path.join(__dirname, '../.env.local') });

interface RoleCheck {
  champion: string;
  inferredRole: Role;
  expectedRole: Role;
  confidence: number;
  correct: boolean;
  gameId?: string;
}

interface RoleAccuracyResult {
  accuracy: number;
  checks: RoleCheck[];
  lowConfidencePicks: number;
  byConfidenceBand: {
    high: { total: number; correct: number };
    medium: { total: number; correct: number };
    low: { total: number; correct: number };
  };
}

/**
 * Ground truth role assignments for pure picks.
 * These champions have >90% probability in a single role.
 */
const PURE_ROLES: Record<string, Role> = {
  // ADC (pure)
  'Jinx': 'adc',
  'Aphelios': 'adc',
  'Zeri': 'adc',
  'Jhin': 'adc',
  'Caitlyn': 'adc',
  'Xayah': 'adc',
  'Kalista': 'adc',
  'Sivir': 'adc',
  'Kai\'Sa': 'adc',
  'Ashe': 'adc',
  'Vayne': 'adc',

  // Support (pure)
  'Thresh': 'support',
  'Nautilus': 'support',
  'Lulu': 'support',
  'Leona': 'support',
  'Alistar': 'support',
  'Rakan': 'support',
  'Bard': 'support',
  'Braum': 'support',
  'Nami': 'support',
  'Janna': 'support',
  'Yuumi': 'support',
  'Soraka': 'support',

  // Mid (pure)
  'Azir': 'mid',
  'Orianna': 'mid',
  'Viktor': 'mid',
  'Ahri': 'mid',
  'LeBlanc': 'mid',
  'Zoe': 'mid',
  'Kassadin': 'mid',

  // Jungle (pure)
  'Lee Sin': 'jungle',
  'Elise': 'jungle',
  'Nidalee': 'jungle',
  'Kha\'Zix': 'jungle',
  'Kindred': 'jungle',
  'Viego': 'jungle',
  'Vi': 'jungle',

  // Top (pure)
  'Gnar': 'top',
  'Renekton': 'top',
  'Fiora': 'top',
  'Aatrox': 'top',
  'Ornn': 'top',
  'K\'Sante': 'top',
};

/**
 * Known flex picks that can legitimately play multiple roles.
 * Role inference may be correct even if it differs from our guess.
 */
const FLEX_PICKS = new Set([
  'Swain',
  'Seraphine',
  'Syndra',
  'Xerath',
  'Zyra',
  'Brand',
  'Vel\'Koz',
  'Sett',
  'Shen',
  'Poppy',
  'Cho\'Gath',
  'Gragas',
  'Rumble',
  'Kennen',
  'Trundle',
  'Wukong',
  'Nocturne',
  'Taliyah',
  'Qiyana',
  'Diana',
  'Tristana',
  'Varus',
  'Galio',
  'Pantheon',
  'Pyke',
  'Akali',
  'Sylas',
  'Lucian',
  'Ezreal',
  'Corki',
  'Jayce',
  'Camille',
  'Jax',
  'Gangplank',
  'Graves',
  'Jarvan IV',
  'Sejuani',
]);

async function checkRoleAccuracy(): Promise<RoleAccuracyResult> {
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    db: { schema: 'synapse' },
  });

  console.log('🎯 Checking role inference accuracy...\n');

  // Select 200 random champion picks (to get ~100 pure picks)
  const { data: picks, error } = await supabase
    .from('champion_picks')
    .select('id, champion_name, role, role_confidence, draft_id, drafts!inner(game_id)')
    .order('id')
    .limit(200);

  if (error || !picks) {
    throw new Error(`Failed to fetch champion picks: ${error?.message}`);
  }

  console.log(`📊 Sampled ${picks.length} champion picks\n`);

  const checks: RoleCheck[] = [];
  let lowConfidencePicks = 0;

  const byConfidenceBand = {
    high: { total: 0, correct: 0 },    // >0.85
    medium: { total: 0, correct: 0 },  // 0.5-0.85
    low: { total: 0, correct: 0 },     // <0.5
  };

  for (const pick of picks) {
    const champion = pick.champion_name;
    const inferredRole = pick.role;
    const confidence = pick.role_confidence || 0;

    // Skip if champion isn't in our ground truth
    if (!PURE_ROLES[champion]) {
      continue;
    }

    const expectedRole = PURE_ROLES[champion];
    const correct = inferredRole === expectedRole;

    checks.push({
      champion,
      inferredRole,
      expectedRole,
      confidence,
      correct,
      gameId: (pick.drafts as any)?.game_id,
    });

    // Track by confidence band
    if (confidence > 0.85) {
      byConfidenceBand.high.total++;
      if (correct) byConfidenceBand.high.correct++;
    } else if (confidence >= 0.5) {
      byConfidenceBand.medium.total++;
      if (correct) byConfidenceBand.medium.correct++;
    } else {
      byConfidenceBand.low.total++;
      if (correct) byConfidenceBand.low.correct++;
      lowConfidencePicks++;
    }
  }

  // Calculate overall accuracy
  const totalChecked = checks.length;
  const totalCorrect = checks.filter(c => c.correct).length;
  const accuracy = totalChecked > 0 ? totalCorrect / totalChecked : 0;

  console.log(`✅ Checked ${totalChecked} pure picks against ground truth\n`);

  return {
    accuracy,
    checks,
    lowConfidencePicks,
    byConfidenceBand,
  };
}

// Main execution
async function main() {
  try {
    const result = await checkRoleAccuracy();

    console.log('='.repeat(60));
    console.log('ROLE ACCURACY RESULTS');
    console.log('='.repeat(60) + '\n');

    console.log(`Overall Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
    console.log(`Total Checked: ${result.checks.length} pure picks\n`);

    console.log('Accuracy by Confidence Band:');
    console.log(`  High (>0.85):   ${result.byConfidenceBand.high.correct}/${result.byConfidenceBand.high.total} = ${result.byConfidenceBand.high.total > 0 ? ((result.byConfidenceBand.high.correct / result.byConfidenceBand.high.total) * 100).toFixed(1) : 0}%`);
    console.log(`  Medium (0.5-0.85): ${result.byConfidenceBand.medium.correct}/${result.byConfidenceBand.medium.total} = ${result.byConfidenceBand.medium.total > 0 ? ((result.byConfidenceBand.medium.correct / result.byConfidenceBand.medium.total) * 100).toFixed(1) : 0}%`);
    console.log(`  Low (<0.5):     ${result.byConfidenceBand.low.correct}/${result.byConfidenceBand.low.total} = ${result.byConfidenceBand.low.total > 0 ? ((result.byConfidenceBand.low.correct / result.byConfidenceBand.low.total) * 100).toFixed(1) : 0}%`);
    console.log();

    // Show incorrect assignments
    const incorrect = result.checks.filter(c => !c.correct);
    if (incorrect.length > 0) {
      console.log('❌ Incorrect Role Assignments:');
      incorrect.slice(0, 10).forEach(check => {
        console.log(`  ${check.champion}: ${check.inferredRole} (expected ${check.expectedRole}) - confidence ${check.confidence.toFixed(2)}`);
      });
      if (incorrect.length > 10) {
        console.log(`  ... and ${incorrect.length - 10} more\n`);
      } else {
        console.log();
      }
    }

    // Show low confidence picks for review
    const lowConfidence = result.checks.filter(c => c.confidence < 0.5);
    if (lowConfidence.length > 0) {
      console.log('⚠️  Low Confidence Picks (may need manual review):');
      lowConfidence.slice(0, 5).forEach(check => {
        console.log(`  ${check.champion} → ${check.inferredRole} (confidence ${check.confidence.toFixed(2)})`);
      });
      if (lowConfidence.length > 5) {
        console.log(`  ... and ${lowConfidence.length - 5} more\n`);
      } else {
        console.log();
      }
    }

    console.log('='.repeat(60));

    // Success criteria: >90% accuracy for high confidence picks
    const highConfidenceAccuracy = result.byConfidenceBand.high.total > 0
      ? result.byConfidenceBand.high.correct / result.byConfidenceBand.high.total
      : 0;

    if (highConfidenceAccuracy >= 0.9 && result.accuracy >= 0.85) {
      console.log('✅ SUCCESS: Role inference meets accuracy targets');
      console.log('   - High confidence (>0.85): >90% accuracy ✓');
      console.log('   - Overall: >85% accuracy ✓');
      console.log('='.repeat(60) + '\n');
      process.exit(0);
    } else {
      console.log('⚠️  WARNING: Role inference accuracy below targets');
      if (highConfidenceAccuracy < 0.9) {
        console.log(`   - High confidence accuracy: ${(highConfidenceAccuracy * 100).toFixed(1)}% (target: >90%)`);
      }
      if (result.accuracy < 0.85) {
        console.log(`   - Overall accuracy: ${(result.accuracy * 100).toFixed(1)}% (target: >85%)`);
      }
      console.log('='.repeat(60) + '\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Role accuracy check failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
