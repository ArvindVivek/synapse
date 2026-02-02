/**
 * Download script for LoL champion images and esports team logos
 *
 * Run with: npx ts-node scripts/download-assets.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const CHAMPIONS_DIR = path.join(PUBLIC_DIR, 'champions')
const TEAMS_DIR = path.join(PUBLIC_DIR, 'teams')

// DDragon version for champion images
const DDRAGON_VERSION = '14.24.1'

// Champion name mappings (display name -> ddragon name)
const DDRAGON_NAME_MAP: Record<string, string> = {
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
  'LeBlanc': 'Leblanc',
  "Kai'Sa": 'Kaisa',
  "Kha'Zix": 'Khazix',
  "Cho'Gath": 'Chogath',
  "Vel'Koz": 'Velkoz',
  "Rek'Sai": 'RekSai',
  "K'Sante": 'KSante',
  "Bel'Veth": 'Belveth',
  "Kog'Maw": 'KogMaw',
  'Wukong': 'MonkeyKing',
  'Nunu & Willump': 'Nunu',
}

// All champions used in the app (from DAMAGE_TYPES + common picks)
const CHAMPIONS = [
  // AP mids
  'Azir', 'Orianna', 'Syndra', 'Viktor', 'Ahri', 'Corki', 'Taliyah', 'Zoe',
  'Neeko', 'Lissandra', 'Sylas', 'LeBlanc', 'Aurora', 'Hwei', 'Naafiri',
  'Annie', 'Cassiopeia', 'Malzahar', 'Veigar', 'Xerath', 'Ziggs', 'Anivia',
  // AD mids
  'Yone', 'Yasuo', 'Jayce', 'Akshan', 'Zed', 'Talon', 'Qiyana',
  // ADCs
  'Jinx', 'Aphelios', 'Varus', 'Zeri', "Kai'Sa", 'Xayah', 'Caitlyn', 'Ezreal',
  'Jhin', 'Ashe', 'Kalista', 'Senna', 'Lucian', 'Samira', 'Draven', 'Sivir',
  'Twitch', 'Kogmaw', 'Vayne', 'Tristana', 'Miss Fortune', 'Smolder',
  // AD tops
  'Aatrox', 'Fiora', 'Renekton', 'Gnar', 'Jax', 'Camille', 'Gangplank',
  'Darius', 'Riven', 'Irelia', 'Sett', 'Mordekaiser', 'Trundle', 'Urgot',
  'Ambessa', 'Garen', 'Illaoi', 'Kled', 'Pantheon', 'Rengar', 'Tryndamere',
  'Volibear', 'Warwick', 'Yorick',
  // AP/Tank tops
  "K'Sante", 'Kennen', 'Rumble', 'Gwen', 'Ornn', 'Maokai', 'Sejuani',
  'Skarner', 'Poppy', 'Shen', 'Malphite', 'Cho\'Gath', 'Sion', 'Mundo',
  'Gragas', 'Singed', 'Teemo', 'Vladimir', 'Zac',
  // AD junglers
  'Lee Sin', 'Viego', 'Xin Zhao', "Rek'Sai", 'Vi', 'Wukong', 'Jarvan IV',
  'Nocturne', 'Graves', 'Hecarim', 'Khazix', 'Kindred', 'Kayn', 'Rengar',
  'Belveth', 'Briar', 'Udyr', 'Olaf', 'Shyvana', 'Master Yi', 'Warwick',
  // AP junglers
  'Nidalee', 'Elise', 'Lillia', 'Karthus', 'Evelynn', 'Ekko', 'Diana',
  'Fiddlesticks', 'Ivern', 'Amumu', 'Nunu & Willump', 'Rammus', 'Zac',
  // Supports
  'Thresh', 'Nautilus', 'Leona', 'Rakan', 'Renata Glasc', 'Lulu', 'Karma',
  'Yuumi', 'Braum', 'Alistar', 'Tahm Kench', 'Rell', 'Morgana', 'Janna',
  'Zilean', 'Nami', 'Soraka', 'Sona', 'Bard', 'Pyke', 'Blitzcrank',
  'Taric', 'Seraphine', 'Senna', 'Milio', 'Xerath', 'Brand', 'Zyra',
  'Velkoz', 'Lux',
]

// Team logo URLs (using official sources where available)
// Most logos come from esports wikis and official team sites
const TEAM_LOGOS: Record<string, string> = {
  // LCS Teams - using Liquipedia/official logos
  'c9': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2Fcloud9-new-logo.png',
  'tl': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631820035918_tl-2021-wordmark-blue.png',
  '100t': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819887423_100t-wordmark-logotype-2021-01-1.png',
  'fly': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819971847_FQ2021_Primary%2520Logo_RGB_ON_DARK.png',
  'nrg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673992505588_NRG.png',
  'dig': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2Fdig-new-logo.png',
  'imt': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2FIMT_Logo.png',
  'gg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2FGolden_Guardianslogo_square.png',
  'eg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631820005431_EG_EXP_1C_WORDMARK_BT.png',
  'clg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819846666_CLG-logo.png',

  // LCK Teams
  't1': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819669150_t1-2021-icon.png',
  'geng': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819739498_gen-square-2021.png',
  'hle': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673561298426_HLE_Wordmark.png',
  'kt': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819783137_kt-2021-logo.png',
  'dk': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673560990714_DplusKIA_Wordmark.png',
  'drx': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673548414709_DRX_Wordmark.png',
  'kdf': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673548366877_Kwangdong_Freecs_Logo_Wordmark.png',
  'lsb': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673547653929_SANDBOX_Wordmark.png',
  'ns': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631820078270_ns-2021-logo.png',
  'bro': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673561257976_OKBrion_Wordmark.png',

  // LEC Teams
  'g2': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819714498_g2-2021-logo.png',
  'fnc': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2Ffnatic-new-logo.png',
  'mad': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2Fmad-new-logo.png',
  'vit': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819939498_VIT-FullColor-Darkbackground.png',
  'rge': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819909348_rogue-primary-logo-color.png',
  'xl': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819868579_excel-esports-logo.png',
  'sk': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631820049844_SK.png',
  'bds': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1641292781078_BDS_Symbol_Color-Dark_BG.png',
  'th': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673547495152_Heretics_Wordmark.png',
  'kc': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1673547560179_KarmineCorp_Wordmark.png',

  // LPL Teams
  'jdg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819763755_jd-gaming-2021-logo.png',
  'blg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819830179_blg-2021-logo.png',
  'wbg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819953499_WBG-logo.png',
  'tes': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819809478_tes-2021-logo.png',
  'edg': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819895137_edg-2021-logo.png',
  'lng': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2Flng-new-logo.png',
  'rng': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819854096_rng-2021-logo.png',
  'fpx': 'https://am-a.akamaihd.net/image?resize=60:&f=http%3A%2F%2Fstatic.lolesports.com%2Fteams%2F1631819923424_fpx-2021-logo.png',
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          fs.unlinkSync(dest)
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject)
        }
      }

      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }

      response.pipe(file)

      file.on('finish', () => {
        file.close()
        resolve()
      })
    })

    request.on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })

    file.on('error', (err) => {
      fs.unlinkSync(dest)
      reject(err)
    })
  })
}

async function downloadChampions() {
  console.log('Downloading champion images...')

  // Ensure directory exists
  if (!fs.existsSync(CHAMPIONS_DIR)) {
    fs.mkdirSync(CHAMPIONS_DIR, { recursive: true })
  }

  // Get unique champions
  const uniqueChampions = [...new Set(CHAMPIONS)]
  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const champion of uniqueChampions) {
    const ddragonName = DDRAGON_NAME_MAP[champion] || champion.replace(/['\s]/g, '')
    const fileName = `${ddragonName}.png`
    const filePath = path.join(CHAMPIONS_DIR, fileName)

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      skipped++
      continue
    }

    const url = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${ddragonName}.png`

    try {
      await downloadFile(url, filePath)
      downloaded++
      process.stdout.write(`\rDownloaded: ${downloaded} | Skipped: ${skipped} | Failed: ${failed}`)
    } catch (err) {
      failed++
      console.error(`\nFailed to download ${champion}: ${err}`)
    }
  }

  console.log(`\nChampions complete: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`)
}

async function downloadTeamLogos() {
  console.log('\nDownloading team logos...')

  // Ensure directory exists
  if (!fs.existsSync(TEAMS_DIR)) {
    fs.mkdirSync(TEAMS_DIR, { recursive: true })
  }

  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const [teamId, url] of Object.entries(TEAM_LOGOS)) {
    const filePath = path.join(TEAMS_DIR, `${teamId}.png`)

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      skipped++
      continue
    }

    try {
      await downloadFile(url, filePath)
      downloaded++
      process.stdout.write(`\rDownloaded: ${downloaded} | Skipped: ${skipped} | Failed: ${failed}`)
    } catch (err) {
      failed++
      console.error(`\nFailed to download ${teamId}: ${err}`)
    }
  }

  console.log(`\nTeams complete: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`)
}

async function main() {
  console.log('=== LoL Asset Downloader ===\n')

  await downloadChampions()
  await downloadTeamLogos()

  console.log('\nDone!')
}

main().catch(console.error)
