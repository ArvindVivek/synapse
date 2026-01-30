/**
 * Champion classification data for composition analysis
 *
 * This module provides champion property lookups used by:
 * - composition-score.ts (04-01): Team comp balance scoring
 * - player-predictor.ts (04-03): Team needs assessment for predictions
 *
 * Note: These are hardcoded for common pro play champions.
 * Future enhancement: Query champion_stats_computed for dynamic data.
 */

// Damage type classification
export const DAMAGE_TYPES: Record<string, 'ap' | 'ad' | 'mixed'> = {
  // AP mids
  'Azir': 'ap', 'Orianna': 'ap', 'Syndra': 'ap', 'Viktor': 'ap',
  'Ahri': 'ap', 'Corki': 'mixed', 'Taliyah': 'ap', 'Zoe': 'ap',
  'Neeko': 'ap', 'Lissandra': 'ap', 'Sylas': 'ap', 'LeBlanc': 'ap',
  // AD mids
  'Yone': 'ad', 'Yasuo': 'ad', 'Jayce': 'ad', 'Akshan': 'ad',
  // ADCs
  'Jinx': 'ad', 'Aphelios': 'ad', 'Varus': 'ad', 'Zeri': 'ad',
  'Kai\'Sa': 'mixed', 'Xayah': 'ad', 'Caitlyn': 'ad', 'Ezreal': 'ad',
  'Jhin': 'ad', 'Ashe': 'ad', 'Kalista': 'ad', 'Senna': 'ad',
  // AD tops
  'Aatrox': 'ad', 'Fiora': 'ad', 'Renekton': 'ad', 'Gnar': 'ad',
  'Jax': 'ad', 'Camille': 'ad', 'Gangplank': 'mixed',
  // AP tops
  'K\'Sante': 'ad', 'Kennen': 'ap', 'Rumble': 'ap', 'Gwen': 'ap',
  // Tanks (usually low damage)
  'Ornn': 'mixed', 'Maokai': 'ap', 'Sejuani': 'ap', 'Skarner': 'ad',
  // AD junglers
  'Lee Sin': 'ad', 'Viego': 'ad', 'Xin Zhao': 'ad', 'Rek\'Sai': 'ad',
  'Vi': 'ad', 'Wukong': 'ad', 'Jarvan IV': 'ad', 'Nocturne': 'ad',
  // AP junglers
  'Nidalee': 'ap', 'Elise': 'ap', 'Lillia': 'ap', 'Karthus': 'ap',
  // Supports (damage type less relevant but included)
  'Thresh': 'ap', 'Nautilus': 'ap', 'Leona': 'ap', 'Rakan': 'ap',
  'Renata Glasc': 'ap', 'Lulu': 'ap', 'Karma': 'ap', 'Yuumi': 'ap',
  'Braum': 'ap', 'Alistar': 'ap', 'Tahm Kench': 'ap', 'Rell': 'ap',
  'Morgana': 'ap', 'Janna': 'ap', 'Zilean': 'ap',
}

// Champions with hard engage
export const HAS_ENGAGE: Set<string> = new Set([
  'Sejuani', 'Maokai', 'Nautilus', 'Leona', 'Rakan',
  'Ornn', 'Malphite', 'Jarvan IV', 'Rell', 'Alistar',
  'Skarner', 'Zac', 'Amumu', 'Wukong', 'Kennen',
  'Gragas', 'Renata Glasc', 'Neeko', 'Vi', 'Camille',
])

// Champions that provide frontline/tankiness
export const IS_FRONTLINE: Set<string> = new Set([
  'Ornn', 'Maokai', 'Sejuani', 'Skarner', 'K\'Sante',
  'Nautilus', 'Braum', 'Alistar', 'Tahm Kench', 'Leona',
  'Rell', 'Zac', 'Cho\'Gath', 'Sion', 'Malphite',
  'Aatrox', 'Renekton', 'Gnar',
])

// Champions that provide peel/protection for carries
export const HAS_PEEL: Set<string> = new Set([
  'Lulu', 'Janna', 'Karma', 'Thresh', 'Braum',
  'Tahm Kench', 'Renata Glasc', 'Yuumi', 'Morgana',
  'Shen', 'Galio', 'Zilean',
])

/**
 * Assess what a team composition needs
 */
export function assessTeamNeeds(teamPicks: string[]): string[] {
  const needs: string[] = []

  // Check damage balance
  const apCount = teamPicks.filter(c => DAMAGE_TYPES[c] === 'ap').length
  const adCount = teamPicks.filter(c => DAMAGE_TYPES[c] === 'ad').length

  if (apCount === 0 && teamPicks.length >= 2) needs.push('ap_damage')
  if (adCount === 0 && teamPicks.length >= 2) needs.push('ad_damage')

  // Check engage
  if (!teamPicks.some(c => HAS_ENGAGE.has(c)) && teamPicks.length >= 3) {
    needs.push('engage')
  }

  // Check frontline
  if (!teamPicks.some(c => IS_FRONTLINE.has(c)) && teamPicks.length >= 3) {
    needs.push('frontline')
  }

  return needs
}

/**
 * Check if a champion fills any of the specified team needs
 */
export function championFillsTeamNeed(
  champion: string,
  needs: string[]
): boolean {
  for (const need of needs) {
    if (need === 'ap_damage' && DAMAGE_TYPES[champion] === 'ap') return true
    if (need === 'ad_damage' && DAMAGE_TYPES[champion] === 'ad') return true
    if (need === 'engage' && HAS_ENGAGE.has(champion)) return true
    if (need === 'frontline' && IS_FRONTLINE.has(champion)) return true
  }
  return false
}

/**
 * Get which needs a champion fills
 */
export function getFilledNeeds(
  champion: string,
  needs: string[]
): string[] {
  const filled: string[] = []
  for (const need of needs) {
    if (need === 'ap_damage' && DAMAGE_TYPES[champion] === 'ap') filled.push('ap_damage')
    if (need === 'ad_damage' && DAMAGE_TYPES[champion] === 'ad') filled.push('ad_damage')
    if (need === 'engage' && HAS_ENGAGE.has(champion)) filled.push('engage')
    if (need === 'frontline' && IS_FRONTLINE.has(champion)) filled.push('frontline')
  }
  return filled
}
