/**
 * Team icon utilities
 *
 * Maps team names to their icon files in /public/teams/
 * Falls back to generated initials if icon not found.
 */

// Map of team names (lowercase) to their icon filename
// Using locally generated SVG logos in /public/teams/
const TEAM_ICONS: Record<string, string> = {
  // LCS Teams
  'cloud9': 'c9.svg',
  'c9': 'c9.svg',
  'team liquid': 'tl.svg',
  'liquid': 'tl.svg',
  'tl': 'tl.svg',
  '100 thieves': '100t.svg',
  '100t': '100t.svg',
  'flyquest': 'fly.svg',
  'fly': 'fly.svg',
  'nrg': 'nrg.svg',
  'dignitas': 'dig.svg',
  'dig': 'dig.svg',
  'immortals': 'imt.svg',
  'imt': 'imt.svg',
  'golden guardians': 'gg.svg',
  'gg': 'gg.svg',
  'evil geniuses': 'eg.svg',
  'eg': 'eg.svg',
  'counter logic gaming': 'clg.svg',
  'clg': 'clg.svg',

  // LCK Teams
  't1': 't1.svg',
  'skt': 't1.svg',
  'gen.g': 'geng.svg',
  'geng': 'geng.svg',
  'hanwha life esports': 'hle.svg',
  'hle': 'hle.svg',
  'kt rolster': 'kt.svg',
  'kt': 'kt.svg',
  'dplus kia': 'dk.svg',
  'dk': 'dk.svg',
  'damwon': 'dk.svg',
  'drx': 'drx.svg',
  'kwangdong freecs': 'kdf.svg',
  'kdf': 'kdf.svg',
  'liiv sandbox': 'lsb.svg',
  'lsb': 'lsb.svg',
  'nongshim redforce': 'ns.svg',
  'ns': 'ns.svg',
  'brion': 'bro.svg',
  'ok brion': 'bro.svg',
  'bro': 'bro.svg',

  // LEC Teams
  'g2 esports': 'g2.svg',
  'g2': 'g2.svg',
  'fnatic': 'fnc.svg',
  'fnc': 'fnc.svg',
  'mad lions': 'mad.svg',
  'mad': 'mad.svg',
  'team vitality': 'vit.svg',
  'vitality': 'vit.svg',
  'vit': 'vit.svg',
  'rogue': 'rge.svg',
  'rge': 'rge.svg',
  'excel esports': 'xl.svg',
  'xl': 'xl.svg',
  'sk gaming': 'sk.svg',
  'sk': 'sk.svg',
  'team bds': 'bds.svg',
  'bds': 'bds.svg',
  'team heretics': 'th.svg',
  'th': 'th.svg',
  'karmine corp': 'kc.svg',
  'kc': 'kc.svg',

  // LPL Teams
  'jd gaming': 'jdg.svg',
  'jdg': 'jdg.svg',
  'bilibili gaming': 'blg.svg',
  'blg': 'blg.svg',
  'weibo gaming': 'wbg.svg',
  'wbg': 'wbg.svg',
  'top esports': 'tes.svg',
  'tes': 'tes.svg',
  'edward gaming': 'edg.svg',
  'edg': 'edg.svg',
  'lng esports': 'lng.svg',
  'lng': 'lng.svg',
  'royal never give up': 'rng.svg',
  'rng': 'rng.svg',
  'funplus phoenix': 'fpx.svg',
  'fpx': 'fpx.svg',
}

// Team abbreviations for display
const TEAM_ABBREVIATIONS: Record<string, string> = {
  'cloud9': 'C9',
  'team liquid': 'TL',
  '100 thieves': '100T',
  'flyquest': 'FLY',
  'dignitas': 'DIG',
  'immortals': 'IMT',
  'golden guardians': 'GG',
  'evil geniuses': 'EG',
  'counter logic gaming': 'CLG',
  't1': 'T1',
  'gen.g': 'GEN',
  'hanwha life esports': 'HLE',
  'kt rolster': 'KT',
  'dplus kia': 'DK',
  'drx': 'DRX',
  'kwangdong freecs': 'KDF',
  'liiv sandbox': 'LSB',
  'nongshim redforce': 'NS',
  'ok brion': 'BRO',
  'g2 esports': 'G2',
  'fnatic': 'FNC',
  'mad lions': 'MAD',
  'team vitality': 'VIT',
  'rogue': 'RGE',
  'excel esports': 'XL',
  'sk gaming': 'SK',
  'team bds': 'BDS',
  'team heretics': 'TH',
  'karmine corp': 'KC',
  'jd gaming': 'JDG',
  'bilibili gaming': 'BLG',
  'weibo gaming': 'WBG',
  'top esports': 'TES',
  'edward gaming': 'EDG',
  'lng esports': 'LNG',
  'royal never give up': 'RNG',
  'funplus phoenix': 'FPX',
}

// Team colors for gradient backgrounds
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  'c9': { primary: '#00a8e1', secondary: '#1e3a5f' },
  'tl': { primary: '#0a2240', secondary: '#d4af37' },
  '100t': { primary: '#e3373c', secondary: '#1a1a1a' },
  'fly': { primary: '#17803d', secondary: '#ffd700' },
  't1': { primary: '#e2012d', secondary: '#ffffff' },
  'geng': { primary: '#aa8a34', secondary: '#1a1a1a' },
  'g2': { primary: '#1a1a1a', secondary: '#ffffff' },
  'fnc': { primary: '#ff5900', secondary: '#1a1a1a' },
  'default': { primary: '#6366f1', secondary: '#1e1b4b' },
}

/**
 * Get the URL for a team's icon
 * Returns local path if icon exists, null otherwise
 */
export function getTeamIconUrl(teamName: string): string | null {
  const normalized = teamName.toLowerCase().trim()
  const iconFile = TEAM_ICONS[normalized]

  if (iconFile) {
    return `/teams/${iconFile}`
  }

  return null
}

/**
 * Get team abbreviation for display
 */
export function getTeamAbbreviation(teamName: string): string {
  const normalized = teamName.toLowerCase().trim()

  // Check if we have a known abbreviation
  if (TEAM_ABBREVIATIONS[normalized]) {
    return TEAM_ABBREVIATIONS[normalized]
  }

  // Generate abbreviation from name
  const words = teamName.split(' ')
  if (words.length === 1) {
    return teamName.slice(0, 3).toUpperCase()
  }

  // Take first letter of each word
  return words
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 4)
}

/**
 * Get team colors for styling
 */
export function getTeamColors(teamName: string): { primary: string; secondary: string } {
  const normalized = teamName.toLowerCase().trim()
  const abbrev = getTeamAbbreviation(teamName).toLowerCase()

  return TEAM_COLORS[normalized] || TEAM_COLORS[abbrev] || TEAM_COLORS['default']
}

/**
 * Check if we have an icon for this team
 */
export function hasTeamIcon(teamName: string): boolean {
  const normalized = teamName.toLowerCase().trim()
  return !!TEAM_ICONS[normalized]
}
