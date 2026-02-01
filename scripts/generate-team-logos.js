const fs = require('fs');
const path = require('path');

const TEAMS_DIR = path.join(__dirname, '..', 'public', 'teams');

// Team data: abbreviation, primary color, secondary color
const TEAMS = {
  'c9': { abbrev: 'C9', primary: '#00a8e1', secondary: '#1e3a5f' },
  'tl': { abbrev: 'TL', primary: '#0a2240', secondary: '#c4a500' },
  '100t': { abbrev: '100', primary: '#e2003a', secondary: '#1a1a1a' },
  'fly': { abbrev: 'FLY', primary: '#17803d', secondary: '#1a1a1a' },
  'nrg': { abbrev: 'NRG', primary: '#ff4655', secondary: '#1a1a1a' },
  'dig': { abbrev: 'DIG', primary: '#ffc800', secondary: '#1a1a1a' },
  'imt': { abbrev: 'IMT', primary: '#01b3ac', secondary: '#1a1a1a' },
  'gg': { abbrev: 'GG', primary: '#f5a623', secondary: '#1a1a1a' },
  'eg': { abbrev: 'EG', primary: '#24272c', secondary: '#ffffff' },
  'clg': { abbrev: 'CLG', primary: '#0099d9', secondary: '#1a1a1a' },
  't1': { abbrev: 'T1', primary: '#e2012d', secondary: '#ffffff' },
  'geng': { abbrev: 'GEN', primary: '#aa8a34', secondary: '#1a1a1a' },
  'hle': { abbrev: 'HLE', primary: '#ff6b00', secondary: '#1a1a1a' },
  'kt': { abbrev: 'KT', primary: '#e2012d', secondary: '#1a1a1a' },
  'dk': { abbrev: 'DK', primary: '#0fa0dc', secondary: '#1a1a1a' },
  'drx': { abbrev: 'DRX', primary: '#0050a0', secondary: '#00a0dc' },
  'kdf': { abbrev: 'KDF', primary: '#e40044', secondary: '#1a1a1a' },
  'lsb': { abbrev: 'LSB', primary: '#ffd700', secondary: '#1a1a1a' },
  'ns': { abbrev: 'NS', primary: '#d50032', secondary: '#1a1a1a' },
  'bro': { abbrev: 'BRO', primary: '#00a654', secondary: '#1a1a1a' },
  'g2': { abbrev: 'G2', primary: '#1a1a1a', secondary: '#ffffff' },
  'fnc': { abbrev: 'FNC', primary: '#ff5900', secondary: '#1a1a1a' },
  'mad': { abbrev: 'MAD', primary: '#2d9cdb', secondary: '#1a1a1a' },
  'vit': { abbrev: 'VIT', primary: '#f5ee00', secondary: '#1a1a1a' },
  'rge': { abbrev: 'RGE', primary: '#0032a0', secondary: '#c8a500' },
  'xl': { abbrev: 'XL', primary: '#107dac', secondary: '#1a1a1a' },
  'sk': { abbrev: 'SK', primary: '#1a1a1a', secondary: '#ffffff' },
  'bds': { abbrev: 'BDS', primary: '#0a1628', secondary: '#7c3aed' },
  'th': { abbrev: 'TH', primary: '#e2012d', secondary: '#ffcc00' },
  'kc': { abbrev: 'KC', primary: '#0055a0', secondary: '#ffffff' },
  'jdg': { abbrev: 'JDG', primary: '#e2012d', secondary: '#1a1a1a' },
  'blg': { abbrev: 'BLG', primary: '#00a0e9', secondary: '#ff6699' },
  'wbg': { abbrev: 'WBG', primary: '#e2012d', secondary: '#1a1a1a' },
  'tes': { abbrev: 'TES', primary: '#e2012d', secondary: '#1a1a1a' },
  'edg': { abbrev: 'EDG', primary: '#1a1a1a', secondary: '#e2012d' },
  'lng': { abbrev: 'LNG', primary: '#e69500', secondary: '#1a1a1a' },
  'rng': { abbrev: 'RNG', primary: '#c8a500', secondary: '#1a1a1a' },
  'fpx': { abbrev: 'FPX', primary: '#e2012d', secondary: '#c8a500' },
};

function generateSVG(team) {
  const { abbrev, primary, secondary } = team;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#grad)"/>
  <text x="60" y="68" font-family="Arial, sans-serif" font-size="${abbrev.length > 2 ? '32' : '40'}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${abbrev}</text>
</svg>`;
}

function main() {
  if (!fs.existsSync(TEAMS_DIR)) {
    fs.mkdirSync(TEAMS_DIR, { recursive: true });
  }

  let generated = 0;

  for (const [teamId, teamData] of Object.entries(TEAMS)) {
    const svg = generateSVG(teamData);
    const filePath = path.join(TEAMS_DIR, teamId + '.svg');
    fs.writeFileSync(filePath, svg);
    generated++;
  }

  console.log('Generated ' + generated + ' team logo SVGs');
}

main();
