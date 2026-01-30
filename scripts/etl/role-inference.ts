/**
 * Champion Role Inference for League of Legends
 * Uses champion name patterns and player role data to determine position
 */

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

// Champion role priors - probability distribution across roles
// Based on professional play patterns
const CHAMPION_ROLE_PRIORS: Record<string, Record<Role, number>> = {
  // ADC
  'Jinx': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  'Aphelios': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Caitlyn': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Ashe': { top: 0.00, jungle: 0.00, mid: 0.03, adc: 0.95, support: 0.02 },
  'Vayne': { top: 0.03, jungle: 0.00, mid: 0.00, adc: 0.96, support: 0.01 },
  "Kai'Sa": { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  'Xayah': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.99, support: 0.01 },
  'Ezreal': { top: 0.00, jungle: 0.01, mid: 0.05, adc: 0.93, support: 0.01 },
  'Lucian': { top: 0.02, jungle: 0.00, mid: 0.08, adc: 0.89, support: 0.01 },
  'Kalista': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.99, support: 0.01 },
  'Sivir': { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Zeri': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  'Jhin': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  "Kog'Maw": { top: 0.00, jungle: 0.00, mid: 0.01, adc: 0.98, support: 0.01 },
  'Miss Fortune': { top: 0.00, jungle: 0.00, mid: 0.02, adc: 0.97, support: 0.01 },
  'Draven': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.99, support: 0.01 },
  'Samira': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.99, support: 0.01 },
  'Varus': { top: 0.00, jungle: 0.00, mid: 0.25, adc: 0.74, support: 0.01 },
  'Tristana': { top: 0.05, jungle: 0.00, mid: 0.15, adc: 0.79, support: 0.01 },

  // SUPPORT
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
  'Renata Glasc': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },
  'Tahm Kench': { top: 0.30, jungle: 0.00, mid: 0.00, adc: 0.00, support: 0.70 },
  'Milio': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },
  'Rell': { top: 0.00, jungle: 0.00, mid: 0.00, adc: 0.00, support: 1.00 },

  // MID LANE
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
  'Twisted Fate': { top: 0.00, jungle: 0.00, mid: 0.97, adc: 0.02, support: 0.01 },
  'Aurelion Sol': { top: 0.00, jungle: 0.00, mid: 0.98, adc: 0.01, support: 0.01 },
  'Syndra': { top: 0.05, jungle: 0.00, mid: 0.70, adc: 0.05, support: 0.20 },
  'Neeko': { top: 0.10, jungle: 0.05, mid: 0.70, adc: 0.10, support: 0.05 },
  'Hwei': { top: 0.00, jungle: 0.00, mid: 0.95, adc: 0.00, support: 0.05 },
  'Aurora': { top: 0.10, jungle: 0.00, mid: 0.85, adc: 0.00, support: 0.05 },

  // JUNGLE
  'Lee Sin': { top: 0.02, jungle: 0.95, mid: 0.02, adc: 0.00, support: 0.01 },
  'Elise': { top: 0.01, jungle: 0.97, mid: 0.01, adc: 0.00, support: 0.01 },
  'Nidalee': { top: 0.02, jungle: 0.95, mid: 0.02, adc: 0.00, support: 0.01 },
  "Kha'Zix": { top: 0.01, jungle: 0.98, mid: 0.00, adc: 0.00, support: 0.01 },
  'Graves': { top: 0.05, jungle: 0.92, mid: 0.02, adc: 0.00, support: 0.01 },
  'Kindred': { top: 0.02, jungle: 0.96, mid: 0.01, adc: 0.00, support: 0.01 },
  'Viego': { top: 0.03, jungle: 0.95, mid: 0.01, adc: 0.00, support: 0.01 },
  'Jarvan IV': { top: 0.05, jungle: 0.90, mid: 0.04, adc: 0.00, support: 0.01 },
  'Vi': { top: 0.02, jungle: 0.96, mid: 0.01, adc: 0.00, support: 0.01 },
  'Sejuani': { top: 0.10, jungle: 0.87, mid: 0.02, adc: 0.00, support: 0.01 },
  "Rek'Sai": { top: 0.02, jungle: 0.96, mid: 0.01, adc: 0.00, support: 0.01 },
  'Master Yi': { top: 0.01, jungle: 0.98, mid: 0.00, adc: 0.00, support: 0.01 },
  'Xin Zhao': { top: 0.03, jungle: 0.95, mid: 0.01, adc: 0.00, support: 0.01 },
  'Nunu & Willump': { top: 0.01, jungle: 0.98, mid: 0.00, adc: 0.00, support: 0.01 },
  "Bel'Veth": { top: 0.02, jungle: 0.97, mid: 0.00, adc: 0.00, support: 0.01 },
  'Fiddlesticks': { top: 0.01, jungle: 0.90, mid: 0.03, adc: 0.00, support: 0.06 },
  'Maokai': { top: 0.20, jungle: 0.50, mid: 0.00, adc: 0.00, support: 0.30 },
  'Ivern': { top: 0.00, jungle: 0.99, mid: 0.00, adc: 0.00, support: 0.01 },
  'Brand': { top: 0.00, jungle: 0.10, mid: 0.25, adc: 0.00, support: 0.65 },

  // TOP LANE
  'Gnar': { top: 0.95, jungle: 0.02, mid: 0.02, adc: 0.00, support: 0.01 },
  'Jayce': { top: 0.85, jungle: 0.00, mid: 0.14, adc: 0.00, support: 0.01 },
  'Renekton': { top: 0.96, jungle: 0.02, mid: 0.01, adc: 0.00, support: 0.01 },
  'Camille': { top: 0.92, jungle: 0.06, mid: 0.01, adc: 0.00, support: 0.01 },
  'Jax': { top: 0.93, jungle: 0.05, mid: 0.01, adc: 0.00, support: 0.01 },
  'Fiora': { top: 0.98, jungle: 0.01, mid: 0.00, adc: 0.00, support: 0.01 },
  'Gangplank': { top: 0.94, jungle: 0.01, mid: 0.04, adc: 0.00, support: 0.01 },
  'Aatrox': { top: 0.96, jungle: 0.02, mid: 0.01, adc: 0.00, support: 0.01 },
  'Ornn': { top: 0.96, jungle: 0.02, mid: 0.01, adc: 0.00, support: 0.01 },
  "K'Sante": { top: 0.95, jungle: 0.03, mid: 0.01, adc: 0.00, support: 0.01 },
  'Dr. Mundo': { top: 0.75, jungle: 0.23, mid: 0.01, adc: 0.00, support: 0.01 },
  "Cho'Gath": { top: 0.75, jungle: 0.15, mid: 0.05, adc: 0.00, support: 0.05 },
  'Wukong': { top: 0.55, jungle: 0.42, mid: 0.02, adc: 0.00, support: 0.01 },
  'Gragas': { top: 0.40, jungle: 0.35, mid: 0.20, adc: 0.00, support: 0.05 },
  'Rumble': { top: 0.80, jungle: 0.05, mid: 0.14, adc: 0.00, support: 0.01 },
  'Kennen': { top: 0.85, jungle: 0.00, mid: 0.14, adc: 0.00, support: 0.01 },
  'Sion': { top: 0.90, jungle: 0.05, mid: 0.03, adc: 0.00, support: 0.02 },
  'Darius': { top: 0.97, jungle: 0.02, mid: 0.00, adc: 0.00, support: 0.01 },

  // FLEX PICKS
  'Swain': { top: 0.25, jungle: 0.00, mid: 0.15, adc: 0.20, support: 0.40 },
  'Seraphine': { top: 0.00, jungle: 0.00, mid: 0.35, adc: 0.25, support: 0.40 },
  'Sett': { top: 0.50, jungle: 0.20, mid: 0.10, adc: 0.00, support: 0.20 },
  'Shen': { top: 0.85, jungle: 0.05, mid: 0.00, adc: 0.00, support: 0.10 },
  'Poppy': { top: 0.60, jungle: 0.25, mid: 0.00, adc: 0.00, support: 0.15 },
  'Xerath': { top: 0.00, jungle: 0.00, mid: 0.75, adc: 0.00, support: 0.25 },
  'Zyra': { top: 0.00, jungle: 0.00, mid: 0.30, adc: 0.00, support: 0.70 },
  "Vel'Koz": { top: 0.00, jungle: 0.00, mid: 0.40, adc: 0.00, support: 0.60 },
  'Trundle': { top: 0.60, jungle: 0.35, mid: 0.03, adc: 0.00, support: 0.02 },
  'Nocturne': { top: 0.15, jungle: 0.82, mid: 0.02, adc: 0.00, support: 0.01 },
  'Taliyah': { top: 0.02, jungle: 0.60, mid: 0.37, adc: 0.00, support: 0.01 },
  'Qiyana': { top: 0.01, jungle: 0.40, mid: 0.58, adc: 0.00, support: 0.01 },
  'Diana': { top: 0.05, jungle: 0.50, mid: 0.44, adc: 0.00, support: 0.01 },
  'Galio': { top: 0.30, jungle: 0.10, mid: 0.55, adc: 0.00, support: 0.05 },
  'Pantheon': { top: 0.30, jungle: 0.15, mid: 0.35, adc: 0.00, support: 0.20 },
  'Pyke': { top: 0.05, jungle: 0.05, mid: 0.10, adc: 0.00, support: 0.80 },
  'Yone': { top: 0.20, jungle: 0.00, mid: 0.79, adc: 0.00, support: 0.01 },
  'Yasuo': { top: 0.15, jungle: 0.00, mid: 0.80, adc: 0.04, support: 0.01 },
}

// Default prior for unknown champions
const DEFAULT_ROLE_PRIOR: Record<Role, number> = {
  top: 0.20,
  jungle: 0.20,
  mid: 0.20,
  adc: 0.20,
  support: 0.20,
}

// Weights for inference
const WEIGHTS = {
  championPrior: 0.5,
  playerRole: 0.3,
  constraint: 0.2,
}

export interface RoleInferenceInput {
  championName: string
  playerPrimaryRole: Role | null
  assignedRoles: Role[]
}

export interface RoleInferenceResult {
  role: Role
  confidence: number
}

/** Get role prior for a champion */
export function getChampionRolePrior(champion: string): Record<Role, number> {
  return CHAMPION_ROLE_PRIORS[champion] || DEFAULT_ROLE_PRIOR
}

/** Infer role for a champion pick */
export function inferRole(input: RoleInferenceInput): RoleInferenceResult {
  const { championName, playerPrimaryRole, assignedRoles } = input
  const championPriors = getChampionRolePrior(championName)

  const allRoles: Role[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const availableRoles = allRoles.filter(role => !assignedRoles.includes(role))

  if (availableRoles.length === 0) {
    return { role: 'mid', confidence: 0.0 }
  }

  const roleScores: Record<Role, number> = {} as Record<Role, number>

  for (const role of availableRoles) {
    let score = 0
    const championPriorScore = championPriors[role] || 0
    score += championPriorScore * WEIGHTS.championPrior

    if (playerPrimaryRole && role === playerPrimaryRole) {
      score += WEIGHTS.playerRole
    }

    if (championPriorScore > 0) {
      score += WEIGHTS.constraint
    }

    roleScores[role] = score
  }

  let inferredRole: Role = availableRoles[0]
  let maxScore = roleScores[availableRoles[0]]

  for (const role of availableRoles) {
    if (roleScores[role] > maxScore) {
      maxScore = roleScores[role]
      inferredRole = role
    }
  }

  const maxPossibleScore = WEIGHTS.championPrior + WEIGHTS.playerRole + WEIGHTS.constraint
  const confidence = Math.min(maxScore / maxPossibleScore, 1.0)

  return { role: inferredRole, confidence }
}

/** Map GRID role string to our Role type */
export function mapGridRole(gridRole: string | undefined | null): Role | null {
  if (!gridRole) return null

  const roleMap: Record<string, Role> = {
    'top': 'top',
    'top_lane': 'top',
    'jungle': 'jungle',
    'jungler': 'jungle',
    'mid': 'mid',
    'mid_lane': 'mid',
    'middle': 'mid',
    'adc': 'adc',
    'bot': 'adc',
    'bottom': 'adc',
    'carry': 'adc',
    'support': 'support',
    'sup': 'support',
  }

  return roleMap[gridRole.toLowerCase()] || null
}
