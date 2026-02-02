/**
 * Download Team Logos from LoL Esports API
 *
 * Fetches official team logos from the LoL Esports API
 * Run with: npx tsx scripts/download-team-logos.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const TEAMS_DIR = path.join(PUBLIC_DIR, 'teams')

// Map of local team IDs to possible API matches (slug, code, name variations)
const TEAM_NAME_MAP: Record<string, string[]> = {
  // LCK
  't1': ['t1', 'T1'],
  'geng': ['gen-g', 'geng', 'Gen.G', 'Gen.G Esports'],
  'hle': ['hanwha-life-esports', 'hle', 'Hanwha Life Esports'],
  'kt': ['kt-rolster', 'kt', 'KT Rolster'],
  'dk': ['dplus-kia', 'dk', 'dplus', 'Dplus KIA', 'DK'],
  'drx': ['drx', 'DRX'],
  'ns': ['nongshim-redforce', 'ns', 'NONGSHIM RED FORCE', 'Nongshim RedForce', 'NRF'],
  'bro': ['brion', 'bro', 'ok-brion', 'BRION', 'OKBrion', 'BRO'],
  'fearx': ['bnk-fearx', 'fearx', 'BNK FearX', 'FearX'],
  'kdf': ['kwangdong-freecs', 'kdf', 'Kwangdong Freecs', 'KDF'],
  'lsb': ['liiv-sandbox', 'lsb', 'Liiv SANDBOX', 'LSB'],

  // LCS / LTA
  'c9': ['cloud9', 'c9', 'Cloud9', 'Cloud9 Kia', 'C9'],
  'tl': ['team-liquid', 'tl', 'Team Liquid', 'Team Liquid Alienware', 'TL'],
  '100t': ['100-thieves', '100t', '100 Thieves', '100T'],
  'fly': ['flyquest', 'fly', 'FlyQuest', 'FLY'],
  'nrg': ['nrg', 'NRG', 'NRG Kia'],
  'dig': ['dignitas', 'dig', 'Dignitas', 'DIG'],
  'imt': ['immortals', 'imt', 'Immortals', 'Immortals Progressive', 'IMT'],
  'sr': ['shopify-rebellion', 'sr', 'Shopify Rebellion', 'SR'],
  'dsg': ['disguised', 'dsg', 'Disguised', 'DSG'],
  'loud': ['loud', 'LOUD'],
  'furia': ['furia', 'FURIA'],
  'isurus': ['isurus', 'Isurus', 'ISG'],
  'pain': ['pain-gaming', 'pain', 'Pain Gaming', 'PNG'],
  'red': ['red-canids', 'red', 'RED Canids Kalunga', 'RED'],
  'fluxo': ['fluxo', 'Fluxo', 'FLX'],
  'lev': ['leviatan', 'lev', 'LEVIATÁN', 'LEV'],
  'lyon': ['lyon-gaming', 'lyon', 'LYON', 'LYN'],
  'vks': ['vivo-keyd', 'vks', 'Vivo Keyd Stars', 'VKS'],

  // LEC
  'g2': ['g2-esports', 'g2', 'G2 Esports', 'G2'],
  'fnc': ['fnatic', 'fnc', 'Fnatic', 'FNC'],
  'mad': ['mad-lions', 'mad', 'MAD Lions', 'MAD'],
  'vit': ['team-vitality', 'vit', 'Team Vitality', 'VIT'],
  'rge': ['rogue', 'rge', 'Rogue', 'RGE'],
  'xl': ['excel', 'xl', 'Excel Esports', 'XL'],
  'sk': ['sk-gaming', 'sk', 'SK Gaming', 'SK'],
  'bds': ['team-bds', 'bds', 'Team BDS', 'BDS'],
  'th': ['team-heretics', 'th', 'Team Heretics', 'TH'],
  'kc': ['karmine-corp', 'kc', 'Karmine Corp', 'KC'],
  'gx': ['giantx', 'gx', 'GIANTX', 'GX'],
  'mkoi': ['movistar-koi', 'koi', 'Movistar KOI', 'KOI'],

  // LPL
  'jdg': ['jd-gaming', 'jdg', 'JDG', 'Beijing JDG Intel Esports', 'JD Gaming'],
  'blg': ['bilibili-gaming', 'blg', 'BLG', 'BILIBILI GAMING DREAMSMART', 'Bilibili Gaming'],
  'wbg': ['weibo-gaming', 'wbg', 'WBG', 'WeiboGaming Faw Audi', 'Weibo Gaming'],
  'tes': ['top-esports', 'tes', 'TES', 'TopEsports', 'Top Esports'],
  'edg': ['edward-gaming', 'edg', 'EDG', 'SHANGHAI EDWARD GAMING HYCAN', 'EDward Gaming'],
  'lng': ['lng-esports', 'lng', 'LNG', 'Suzhou LNG Ninebot Esports', 'LNG Esports'],
  'rng': ['royal-never-give-up', 'rng', 'RNG', 'Royal Never Give Up'],
  'fpx': ['funplus-phoenix', 'fpx', 'FPX', 'FunPlus Phoenix'],
  'ig': ['invictus-gaming', 'ig', 'IG', 'Invictus Gaming'],
  'omg': ['oh-my-god', 'omg', 'OMG', 'Oh My God'],
  'lgd': ['lgd-gaming', 'lgd', 'LGD', 'Hangzhou LGD Gaming'],
  'we': ['team-we', 'we', 'WE', "Xi'an Team WE", 'Team WE'],
  'up': ['ultra-prime', 'up', 'UP', 'Ultra Prime'],
  'ra': ['rare-atom', 'ra', 'RA', 'Rare Atom'],
  'tt': ['thunder-talk-gaming', 'tt', 'TT', 'THUNDERTALKGAMING', 'ThunderTalk Gaming'],
  'nip': ['ninjas-in-pyjamas', 'nip', 'NIP', 'Shenzhen NINJAS IN PYJAMAS', 'Ninjas in Pyjamas'],
  'al': ['anyones-legend', 'al', 'AL', "Anyone's Legend"],
}

interface Team {
  id: string
  slug: string
  name: string
  code: string
  image: string
  alternativeImage: string
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    const makeRequest = (reqUrl: string) => {
      const urlObj = new URL(reqUrl)
      const reqOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      }

      const proto = reqUrl.startsWith('https') ? https : http
      const request = proto.get(reqOptions, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            file.close()
            if (fs.existsSync(dest)) fs.unlinkSync(dest)
            const fullRedirect = redirectUrl.startsWith('http')
              ? redirectUrl
              : `https://${urlObj.hostname}${redirectUrl}`
            return downloadFile(fullRedirect, dest).then(resolve).catch(reject)
          }
        }

        if (response.statusCode !== 200) {
          file.close()
          if (fs.existsSync(dest)) fs.unlinkSync(dest)
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve()
        })
      })

      request.on('error', (err) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        reject(err)
      })

      file.on('error', (err) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        reject(err)
      })
    }

    makeRequest(url)
  })
}

async function fetchTeams(): Promise<Team[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'esports-api.lolesports.com',
      path: '/persisted/gw/getTeams?hl=en-US',
      headers: {
        'x-api-key': '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z',
        'User-Agent': 'Mozilla/5.0',
      },
    }

    https.get(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.data.teams)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function findTeamMatch(teams: Team[], targetNames: string[]): Team | null {
  for (const target of targetNames) {
    const targetLower = target.toLowerCase()
    const match = teams.find(
      (t) =>
        t.slug?.toLowerCase() === targetLower ||
        t.code?.toLowerCase() === targetLower ||
        t.name?.toLowerCase() === targetLower ||
        t.name?.toLowerCase().includes(targetLower) ||
        targetLower.includes(t.name?.toLowerCase() || '')
    )
    if (match && match.image) return match
  }
  return null
}

async function downloadTeamLogos() {
  console.log('=== Team Logo Downloader ===\n')

  // Ensure directory exists
  if (!fs.existsSync(TEAMS_DIR)) {
    fs.mkdirSync(TEAMS_DIR, { recursive: true })
  }

  console.log('Fetching teams from LoL Esports API...')
  const allTeams = await fetchTeams()
  console.log(`Found ${allTeams.length} teams in API\n`)

  let downloaded = 0
  let skipped = 0
  let failed = 0
  const failures: string[] = []

  for (const [localId, targetNames] of Object.entries(TEAM_NAME_MAP)) {
    const filePath = path.join(TEAMS_DIR, `${localId}.png`)

    // Skip if PNG already exists and is substantial (not placeholder)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      if (stats.size > 2000) {
        skipped++
        continue
      }
    }

    // Find matching team in API
    const team = findTeamMatch(allTeams, targetNames)

    if (!team || !team.image) {
      failed++
      failures.push(localId)
      console.log(`  ✗ ${localId}: No match found in API`)
      continue
    }

    try {
      await downloadFile(team.image, filePath)
      const stats = fs.statSync(filePath)
      if (stats.size > 500) {
        downloaded++
        console.log(`  ✓ ${localId} (${team.name})`)
      } else {
        fs.unlinkSync(filePath)
        throw new Error('File too small')
      }
    } catch (err) {
      // Try alternative image
      if (team.alternativeImage) {
        try {
          await downloadFile(team.alternativeImage, filePath)
          const stats = fs.statSync(filePath)
          if (stats.size > 500) {
            downloaded++
            console.log(`  ✓ ${localId} (${team.name}) [alt]`)
            continue
          }
        } catch {
          // Alt also failed
        }
      }

      failed++
      failures.push(localId)
      console.log(`  ✗ ${localId}: ${err}`)
    }
  }

  console.log('\n========================================')
  console.log('COMPLETE')
  console.log('========================================')
  console.log(`Downloaded: ${downloaded}`)
  console.log(`Skipped:    ${skipped}`)
  console.log(`Failed:     ${failed}`)

  if (failures.length > 0) {
    console.log(`\nFailed teams: ${failures.join(', ')}`)
    console.log('\nNote: Failed teams will keep their existing placeholder SVGs')
  }

  console.log('========================================\n')
}

downloadTeamLogos().catch(console.error)
