/**
 * Champion data module with role mappings
 *
 * Extends champion-properties.ts with role information for filtering
 * and flex pick detection in the draft UI.
 */

import { DAMAGE_TYPES } from '@/lib/recommendations/champion-properties'

/**
 * Mapping from display names to ddragon image IDs
 * Only champions with non-standard names need to be listed here
 */
export const DDRAGON_NAME_MAP: Record<string, string> = {
  // Spaces removed
  'Xin Zhao': 'XinZhao',
  'Lee Sin': 'LeeSin',
  'Jarvan IV': 'JarvanIV',
  'Miss Fortune': 'MissFortune',
  'Twisted Fate': 'TwistedFate',
  'Master Yi': 'MasterYi',
  'Dr. Mundo': 'DrMundo',
  'Aurelion Sol': 'AurelionSol',
  'Tahm Kench': 'TahmKench',
  'Renata Glasc': 'Renata',

  // Apostrophes/special chars removed
  "Kai'Sa": 'Kaisa',
  "Kha'Zix": 'Khazix',
  "Cho'Gath": 'Chogath',
  "Vel'Koz": 'Velkoz',
  "Rek'Sai": 'RekSai',
  "K'Sante": 'KSante',
  "Bel'Veth": 'Belveth',
  "Kog'Maw": 'KogMaw',

  // Completely different names
  'Wukong': 'MonkeyKing',
  'Nunu & Willump': 'Nunu',
}

/**
 * Get the ddragon image URL for a champion
 */
export function getChampionImageUrl(champion: string): string {
  const ddragonName = DDRAGON_NAME_MAP[champion] || champion
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${ddragonName}.png`
}

// Get all champion names from DAMAGE_TYPES
export const ALL_CHAMPIONS = Object.keys(DAMAGE_TYPES)

// Champion role mappings (primary roles based on pro play)
// Champions can have multiple roles - these are the common ones
export const CHAMPION_ROLES: Record<string, ('top' | 'jungle' | 'mid' | 'adc' | 'support')[]> = {
  // AP Mids
  'Azir': ['mid'],
  'Orianna': ['mid'],
  'Syndra': ['mid'],
  'Viktor': ['mid'],
  'Ahri': ['mid'],
  'Corki': ['mid', 'adc'], // Flex: can be played bot
  'Taliyah': ['mid', 'jungle'], // Flex: also jungle
  'Zoe': ['mid'],
  'Neeko': ['mid', 'support'], // Flex: also support
  'Lissandra': ['mid'],
  'Sylas': ['mid', 'top'], // Flex: also top
  'LeBlanc': ['mid'],

  // AD Mids
  'Yone': ['mid', 'top'], // Flex: also top
  'Yasuo': ['mid', 'top'], // Flex: also top
  'Jayce': ['top', 'mid'], // Flex: top primary, mid secondary
  'Akshan': ['mid'],

  // ADCs
  'Jinx': ['adc'],
  'Aphelios': ['adc'],
  'Varus': ['adc'],
  'Zeri': ['adc'],
  'Kai\'Sa': ['adc'],
  'Xayah': ['adc'],
  'Caitlyn': ['adc'],
  'Ezreal': ['adc'],
  'Jhin': ['adc'],
  'Ashe': ['adc'],
  'Kalista': ['adc'],
  'Senna': ['adc', 'support'], // Flex: also support

  // AD Tops
  'Aatrox': ['top'],
  'Fiora': ['top'],
  'Renekton': ['top'],
  'Gnar': ['top'],
  'Jax': ['top', 'jungle'], // Flex: also jungle
  'Camille': ['top', 'jungle'], // Flex: also jungle
  'Gangplank': ['top'],

  // AP/Tank Tops
  'K\'Sante': ['top'],
  'Kennen': ['top'],
  'Rumble': ['top'],
  'Gwen': ['top'],
  'Ornn': ['top'],
  'Maokai': ['top', 'jungle'], // Flex: also jungle
  'Sejuani': ['jungle', 'top'], // Flex: jungle primary, top secondary
  'Skarner': ['jungle'],

  // AD Junglers
  'Lee Sin': ['jungle'],
  'Viego': ['jungle'],
  'Xin Zhao': ['jungle'],
  'Rek\'Sai': ['jungle'],
  'Vi': ['jungle'],
  'Wukong': ['jungle'],
  'Jarvan IV': ['jungle'],
  'Nocturne': ['jungle'],

  // AP Junglers
  'Nidalee': ['jungle'],
  'Elise': ['jungle'],
  'Lillia': ['jungle'],
  'Karthus': ['jungle'],

  // Supports
  'Thresh': ['support'],
  'Nautilus': ['support'],
  'Leona': ['support'],
  'Rakan': ['support'],
  'Renata Glasc': ['support'],
  'Lulu': ['support'],
  'Karma': ['support', 'mid'], // Flex: also mid
  'Yuumi': ['support'],
  'Braum': ['support'],
  'Alistar': ['support'],
  'Tahm Kench': ['support', 'top'], // Flex: also top
  'Rell': ['support'],
  'Morgana': ['support', 'mid'], // Flex: also mid
  'Janna': ['support'],
  'Zilean': ['support', 'mid'], // Flex: also mid
}

// Champions that are flex picks (playable in 2+ roles)
export const FLEX_CHAMPIONS: Set<string> = new Set(
  Object.entries(CHAMPION_ROLES)
    .filter(([, roles]) => roles.length >= 2)
    .map(([name]) => name)
)

/**
 * Helper to check if champion plays a role
 */
export function championPlaysRole(
  champion: string,
  role: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
): boolean {
  return CHAMPION_ROLES[champion]?.includes(role) ?? false
}
