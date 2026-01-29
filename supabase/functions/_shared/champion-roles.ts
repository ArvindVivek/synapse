// Champion role prior distributions for multi-signal role inference
// File: supabase/functions/_shared/champion-roles.ts

import { Role } from './types.ts';

// ==========================================
// CHAMPION ROLE PRIOR DISTRIBUTIONS
// ==========================================

/**
 * Pre-computed role distributions for common professional picks.
 * Based on professional play patterns from major regions (LCS, LEC, LCK, LPL).
 *
 * Distributions sum to ~1.0 for each champion.
 * Pure picks have >0.90 in primary role.
 * Flex picks have significant probability (>0.15) in multiple roles.
 */
export const CHAMPION_ROLE_PRIORS: Record<string, Record<Role, number>> = {
  // ==========================================
  // ADC (Attack Damage Carry) - Bottom Lane
  // ==========================================
  'Jinx': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  'Aphelios': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Caitlyn': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Ashe': { top: 0.00, jungle: 0.00, mid: 0.03, adc: 0.95, support: 0.02 },
  'Vayne': { top: 0.03, jungle: 0.00, mid: 0.00, adc: 0.96, support: 0.01 },
  'Kai\'Sa': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  'Xayah': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.99, support: 0.01 },
  'Ezreal': { top: 0.00, jungle: 0.01, mid: 0.05, adc: 0.93, support: 0.01 },
  'Lucian': { top: 0.02, jungle: 0.00, mid: 0.08, adc: 0.89, support: 0.01 },
  'Kalista': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.99, support: 0.01 },
  'Sivir': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Zeri': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },

  // ==========================================
  // SUPPORT - Bottom Lane
  // ==========================================
  'Thresh': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },
  'Nautilus': { top: 0.05, jungle: 0.05, mid: 0.00, adc: 0.00, support: 0.90 },
  'Leona': { top: 0.02, jungle: 0.03, mid: 0.00, adc: 0.00, support: 0.95 },
  'Alistar': { top: 0.03, jungle: 0.02, mid: 0.00, adc: 0.00, support: 0.95 },
  'Rakan': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },
  'Bard': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },
  'Braum': { top: 0.02, jungle: 0.00, mid: 0.00, adc: 0.00, support: 0.98 },
  'Lulu': { top: 0.02, jungle: 0.00, mid: 0.03, adc: 0.00, support: 0.95 },
  'Nami': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.00, support: 0.99 },
  'Janna': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.00, support: 0.99 },
  'Yuumi': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },
  'Soraka': { top: 0.01, jungle: 0.00, mid: 0.02, adc: 0.00, support: 0.97 },

  // ==========================================
  // MID LANE
  // ==========================================
  'Azir': { top: 0.02, jungle: 0.00, mid: 0.95, adc: 0.02, support: 0.01 },
  'Orianna': { top: 0.00, jungle: 0.00, mid: 0.98, adc: 0.01, support: 0.01 },
  'Viktor': { top: 0.03, jungle: 0.00, mid: 0.95, adc: 0.01, support: 0.01 },
  'Corki': { top: 0.05, jungle: 0.00, mid: 0.90, adc: 0.04, support: 0.01 },
  'Ahri': { top: 0.00, jungle: 0.00, mid: 0.98, adc: 0.01, support: 0.01 },
  'LeBlanc': { top: 0.01, jungle: 0.00, mid: 0.98, adc: 0.00, support: 0.01 },
  'Zoe': { top: 0.00, jungle: 0.00, mid: 0.99, adc: 0.00, support: 0.01 },
  'Kassadin': { top: 0.02, jungle: 0.00, mid: 0.97, adc: 0.00, support: 0.01 },
  'Akali': { top: 0.20, jungle: 0.02, mid: 0.76, adc: 0.01, support: 0.01 },
  'Sylas': { top: 0.15, jungle: 0.10, mid: 0.73, adc: 0.01, support: 0.01 },

  // ==========================================
  // JUNGLE
  // ==========================================
  'Lee Sin': { top: 0.02, jungle: 0.95, mid: 0.02, adc: 0.00, support: 0.01 },
  'Elise': { top: 0.01, jungle: 0.97, mid: 0.01, adc: 0.00, support: 0.01 },
  'Nidalee': { top: 0.02, jungle: 0.95, mid: 0.02, adc: 0.00, support: 0.01 },
  'Kha\'Zix': { top: 0.01, jungle: 0.98, mid: 0.00, adc: 0.00, support: 0.01 },
  'Graves': { top: 0.05, jungle: 0.92, mid: 0.02, adc: 0.00, support: 0.01 },
  'Kindred': { top: 0.02, jungle: 0.96, mid: 0.01, adc: 0.00, support: 0.01 },
  'Viego': { top: 0.03, jungle: 0.95, mid: 0.01, adc: 0.00, support: 0.01 },
  'Jarvan IV': { top: 0.05, jungle: 0.90, mid: 0.04, adc: 0.00, support: 0.01 },
  'Vi': { top: 0.02, jungle: 0.96, mid: 0.01, adc: 0.00, support: 0.01 },
  'Sejuani': { top: 0.10, jungle: 0.87, mid: 0.02, adc: 0.00, support: 0.01 },

  // ==========================================
  // TOP LANE
  // ==========================================
  'Gnar': { top: 0.95, jungle: 0.02, mid: 0.02, adc: 0.00, support: 0.01 },
  'Jayce': { top: 0.85, jungle: 0.00, mid: 0.14, adc: 0.00, support: 0.01 },
  'Renekton': { top: 0.96, jungle: 0.02, mid: 0.01, adc: 0.00, support: 0.01 },
  'Camille': { top: 0.92, jungle: 0.06, mid: 0.01, adc: 0.00, support: 0.01 },
  'Jax': { top: 0.93, jungle: 0.05, mid: 0.01, adc: 0.00, support: 0.01 },
  'Fiora': { top: 0.98, jungle: 0.01, mid: 0.00, adc: 0.00, support: 0.01 },
  'Gangplank': { top: 0.94, jungle: 0.01, mid: 0.04, adc: 0.00, support: 0.01 },
  'Aatrox': { top: 0.96, jungle: 0.02, mid: 0.01, adc: 0.00, support: 0.01 },
  'Ornn': { top: 0.96, jungle: 0.02, mid: 0.01, adc: 0.00, support: 0.01 },
  'K\'Sante': { top: 0.95, jungle: 0.03, mid: 0.01, adc: 0.00, support: 0.01 },

  // ==========================================
  // FLEX PICKS (Multi-role viability)
  // ==========================================

  // Support/Mid/ADC flex
  'Swain': { top: 0.25, jungle: 0.00, mid: 0.15, adc: 0.20, support: 0.40 },
  'Seraphine': { top: 0.00, jungle: 0.00, mid: 0.35, adc: 0.25, support: 0.40 },

  // Support/Mid flex
  'Syndra': { top: 0.05, jungle: 0.00, mid: 0.70, adc: 0.05, support: 0.20 },
  'Xerath': { top: 0.00, jungle: 0.00, mid: 0.75, adc: 0.00, support: 0.25 },
  'Zyra': { top: 0.00, jungle: 0.00, mid: 0.30, adc: 0.00, support: 0.70 },
  'Brand': { top: 0.00, jungle: 0.00, mid: 0.35, adc: 0.00, support: 0.65 },
  'Vel\'Koz': { top: 0.00, jungle: 0.00, mid: 0.40, adc: 0.00, support: 0.60 },

  // Top/Support flex
  'Sett': { top: 0.50, jungle: 0.20, mid: 0.10, adc: 0.00, support: 0.20 },
  'Shen': { top: 0.85, jungle: 0.05, mid: 0.00, adc: 0.00, support: 0.10 },
  'Poppy': { top: 0.60, jungle: 0.25, mid: 0.00, adc: 0.00, support: 0.15 },
  'Cho\'Gath': { top: 0.75, jungle: 0.15, mid: 0.05, adc: 0.00, support: 0.05 },

  // Top/Mid flex
  'Gragas': { top: 0.40, jungle: 0.35, mid: 0.20, adc: 0.00, support: 0.05 },
  'Rumble': { top: 0.80, jungle: 0.05, mid: 0.14, adc: 0.00, support: 0.01 },
  'Kennen': { top: 0.85, jungle: 0.00, mid: 0.14, adc: 0.00, support: 0.01 },

  // Top/Jungle flex
  'Trundle': { top: 0.60, jungle: 0.35, mid: 0.03, adc: 0.00, support: 0.02 },
  'Wukong': { top: 0.55, jungle: 0.42, mid: 0.02, adc: 0.00, support: 0.01 },
  'Nocturne': { top: 0.15, jungle: 0.82, mid: 0.02, adc: 0.00, support: 0.01 },

  // Jungle/Mid flex
  'Taliyah': { top: 0.02, jungle: 0.60, mid: 0.37, adc: 0.00, support: 0.01 },
  'Qiyana': { top: 0.01, jungle: 0.40, mid: 0.58, adc: 0.00, support: 0.01 },
  'Diana': { top: 0.05, jungle: 0.50, mid: 0.44, adc: 0.00, support: 0.01 },

  // ADC/Mid flex
  'Tristana': { top: 0.05, jungle: 0.00, mid: 0.15, adc: 0.79, support: 0.01 },
  'Varus': { top: 0.00, jungle: 0.00, mid: 0.25, adc: 0.74, support: 0.01 },

  // Versatile tanks (3+ roles)
  'Galio': { top: 0.30, jungle: 0.10, mid: 0.55, adc: 0.00, support: 0.05 },
  'Pantheon': { top: 0.30, jungle: 0.15, mid: 0.35, adc: 0.00, support: 0.20 },
  'Pyke': { top: 0.05, jungle: 0.05, mid: 0.10, adc: 0.00, support: 0.80 },
};

/**
 * Default role prior for unknown champions.
 * Assumes equal probability across all roles (uniform distribution).
 */
export const DEFAULT_ROLE_PRIOR: Record<Role, number> = {
  top: 0.20,
  jungle: 0.20,
  mid: 0.20,
  adc: 0.20,
  support: 0.20,
};

/**
 * Get role prior distribution for a champion.
 * Returns pre-computed distribution if available, otherwise returns uniform default.
 *
 * @param champion - Champion name (case-sensitive, matches GRID API format)
 * @returns Role probability distribution (sums to ~1.0)
 */
export function getChampionRolePrior(champion: string): Record<Role, number> {
  return CHAMPION_ROLE_PRIORS[champion] || DEFAULT_ROLE_PRIOR;
}

/**
 * Get most likely role for a champion (highest prior probability).
 * Useful for quick lookups without full inference.
 *
 * @param champion - Champion name
 * @returns Most likely role
 */
export function getPrimaryRole(champion: string): Role {
  const priors = getChampionRolePrior(champion);

  let maxRole: Role = 'mid';
  let maxProb = 0;

  for (const [role, prob] of Object.entries(priors) as [Role, number][]) {
    if (prob > maxProb) {
      maxProb = prob;
      maxRole = role;
    }
  }

  return maxRole;
}

/**
 * Check if a champion is a flex pick (has >15% probability in multiple roles).
 *
 * @param champion - Champion name
 * @returns True if champion can viably play 2+ roles
 */
export function isFlexPick(champion: string): boolean {
  const priors = getChampionRolePrior(champion);
  const viableRoles = Object.values(priors).filter(prob => prob > 0.15);
  return viableRoles.length >= 2;
}

/**
 * Get all champions with defined role priors.
 *
 * @returns Array of champion names
 */
export function getAllKnownChampions(): string[] {
  return Object.keys(CHAMPION_ROLE_PRIORS);
}

/**
 * Get champion count by category.
 *
 * @returns Statistics about champion coverage
 */
export function getChampionCoverage(): {
  total: number;
  purePicks: number; // >0.90 in one role
  flexPicks: number; // >0.15 in 2+ roles
  byPrimaryRole: Record<Role, number>;
} {
  const champions = getAllKnownChampions();

  let purePicks = 0;
  let flexPicks = 0;
  const byPrimaryRole: Record<Role, number> = {
    top: 0,
    jungle: 0,
    mid: 0,
    adc: 0,
    support: 0,
  };

  for (const champion of champions) {
    const priors = CHAMPION_ROLE_PRIORS[champion];
    const maxProb = Math.max(...Object.values(priors));
    const viableRoles = Object.values(priors).filter(p => p > 0.15);

    if (maxProb > 0.90) purePicks++;
    if (viableRoles.length >= 2) flexPicks++;

    const primaryRole = getPrimaryRole(champion);
    byPrimaryRole[primaryRole]++;
  }

  return {
    total: champions.length,
    purePicks,
    flexPicks,
    byPrimaryRole,
  };
}
