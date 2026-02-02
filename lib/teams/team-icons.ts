/**
 * Team icon utilities
 *
 * Maps team names to their icon files in /public/teams/
 * Uses downloaded PNG logos from LoL Esports API.
 * Falls back to generated initials if icon not found.
 */

// Map of team names (lowercase) to their icon filename
// Using downloaded PNG logos from LoL Esports in /public/teams/
const TEAM_ICONS: Record<string, string> = {
  // LCS / LTA Teams
  'cloud9': 'c9.png',
  'cloud9 kia': 'c9.png',
  'c9': 'c9.png',
  'team liquid': 'tl.png',
  'team liquid alienware': 'tl.png',
  'liquid': 'tl.png',
  'tl': 'tl.png',
  '100 thieves': '100t.png',
  '100t': '100t.png',
  'flyquest': 'fly.png',
  'fly': 'fly.png',
  'nrg': 'nrg.png',
  'nrg kia': 'nrg.png',
  'dignitas': 'dig.png',
  'dig': 'dig.png',
  'immortals': 'imt.png',
  'immortals progressive': 'imt.png',
  'imt': 'imt.png',
  'shopify rebellion': 'sr.png',
  'sr': 'sr.png',
  'disguised': 'dsg.png',
  'dsg': 'dsg.png',
  'loud': 'loud.png',
  'furia': 'furia.png',
  'isurus': 'isurus.png',
  'pain gaming': 'pain.png',
  'pain': 'pain.png',
  'red canids': 'red.png',
  'red canids kalunga': 'red.png',
  'red': 'red.png',
  'fluxo': 'fluxo.png',
  'leviatán': 'lev.png',
  'leviatan': 'lev.png',
  'lev': 'lev.png',
  'lyon': 'lyon.png',
  'vivo keyd stars': 'vks.png',
  'vks': 'vks.png',

  // LCK Teams
  't1': 't1.png',
  'skt': 't1.png',
  'gen.g': 'geng.png',
  'gen.g esports': 'geng.png',
  'geng': 'geng.png',
  'hanwha life esports': 'hle.png',
  'hle': 'hle.png',
  'kt rolster': 'kt.png',
  'kt': 'kt.png',
  'dplus kia': 'dk.png',
  'dk': 'dk.png',
  'damwon': 'dk.png',
  'drx': 'drx.png',
  'kwangdong freecs': 'kdf.png',
  'dn soopers': 'kdf.png',
  'kdf': 'kdf.png',
  'liiv sandbox': 'lsb.png',
  'lsb': 'lsb.png',
  'nongshim redforce': 'ns.png',
  'nongshim red force': 'ns.png',
  'ns': 'ns.png',
  'brion': 'bro.png',
  'ok brion': 'bro.png',
  'bro': 'bro.png',
  'bnk fearx': 'fearx.png',
  'fearx': 'fearx.png',

  // LEC Teams
  'g2 esports': 'g2.png',
  'g2': 'g2.png',
  'fnatic': 'fnc.png',
  'fnc': 'fnc.png',
  'mad lions': 'mad.png',
  'mad': 'mad.png',
  'team vitality': 'vit.png',
  'vitality': 'vit.png',
  'vit': 'vit.png',
  'rogue': 'rge.png',
  'rge': 'rge.png',
  'excel esports': 'xl.png',
  'xl': 'xl.png',
  'sk gaming': 'sk.png',
  'sk': 'sk.png',
  'team bds': 'bds.png',
  'bds': 'bds.png',
  'team heretics': 'th.png',
  'th': 'th.png',
  'karmine corp': 'kc.png',
  'kc': 'kc.png',
  'giantx': 'gx.png',
  'gx': 'gx.png',
  'movistar koi': 'mkoi.png',
  'koi': 'mkoi.png',

  // LPL Teams
  'jd gaming': 'jdg.png',
  'beijing jdg intel esports': 'jdg.png',
  'jdg': 'jdg.png',
  'bilibili gaming': 'blg.png',
  'bilibili gaming dreamsmart': 'blg.png',
  'blg': 'blg.png',
  'weibo gaming': 'wbg.png',
  'weibogaming faw audi': 'wbg.png',
  'wbg': 'wbg.png',
  'top esports': 'tes.png',
  'topesports': 'tes.png',
  'tes': 'tes.png',
  'edward gaming': 'edg.png',
  'shanghai edward gaming hycan': 'edg.png',
  'edg': 'edg.png',
  'lng esports': 'lng.png',
  'suzhou lng ninebot esports': 'lng.png',
  'lng': 'lng.png',
  'royal never give up': 'rng.png',
  'rng': 'rng.png',
  'funplus phoenix': 'fpx.png',
  'fpx': 'fpx.png',
  'invictus gaming': 'ig.png',
  'ig': 'ig.png',
  'oh my god': 'omg.png',
  'omg': 'omg.png',
  'lgd gaming': 'lgd.png',
  'hangzhou lgd gaming': 'lgd.png',
  'lgd': 'lgd.png',
  'team we': 'we.png',
  "xi'an team we": 'we.png',
  'we': 'we.png',
  'ultra prime': 'up.png',
  'up': 'up.png',
  'rare atom': 'ra.png',
  'ra': 'ra.png',
  'thundertalk gaming': 'tt.png',
  'thundertalkgaming': 'tt.png',
  'tt': 'tt.png',
  'ninjas in pyjamas': 'nip.png',
  'shenzhen ninjas in pyjamas': 'nip.png',
  'nip': 'nip.png',
  "anyone's legend": 'al.png',
  'al': 'al.png',
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
