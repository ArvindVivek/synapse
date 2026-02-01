const https = require('https');
const fs = require('fs');
const path = require('path');

const TEAMS_DIR = path.join(__dirname, '..', 'public', 'teams');

// Direct static.lolesports.com URLs
const TEAMS = {
  'c9': 'https://static.lolesports.com/teams/cloud9-new-logo.png',
  'tl': 'https://static.lolesports.com/teams/1631820035918_tl-2021-wordmark-blue.png',
  '100t': 'https://static.lolesports.com/teams/1631819887423_100t-wordmark-logotype-2021-01-1.png',
  'fly': 'https://static.lolesports.com/teams/1631819971847_FQ2021_Primary%20Logo_RGB_ON_DARK.png',
  't1': 'https://static.lolesports.com/teams/1631819669150_t1-2021-icon.png',
  'geng': 'https://static.lolesports.com/teams/1631819739498_gen-square-2021.png',
  'g2': 'https://static.lolesports.com/teams/1631819714498_g2-2021-logo.png',
  'fnc': 'https://static.lolesports.com/teams/fnatic-new-logo.png',
  'jdg': 'https://static.lolesports.com/teams/1631819763755_jd-gaming-2021-logo.png',
  'blg': 'https://static.lolesports.com/teams/1631819830179_blg-2021-logo.png',
  'wbg': 'https://static.lolesports.com/teams/1631819953499_WBG-logo.png',
  'tes': 'https://static.lolesports.com/teams/1631819809478_tes-2021-logo.png',
  'edg': 'https://static.lolesports.com/teams/1631819895137_edg-2021-logo.png',
  'rng': 'https://static.lolesports.com/teams/1631819854096_rng-2021-logo.png',
  'hle': 'https://static.lolesports.com/teams/1673561298426_HLE_Wordmark.png',
  'dk': 'https://static.lolesports.com/teams/1673560990714_DplusKIA_Wordmark.png',
  'drx': 'https://static.lolesports.com/teams/1673548414709_DRX_Wordmark.png',
  'kt': 'https://static.lolesports.com/teams/1631819783137_kt-2021-logo.png',
  'mad': 'https://static.lolesports.com/teams/mad-new-logo.png',
  'vit': 'https://static.lolesports.com/teams/1631819939498_VIT-FullColor-Darkbackground.png',
  'dig': 'https://static.lolesports.com/teams/dig-new-logo.png',
  'eg': 'https://static.lolesports.com/teams/1631820005431_EG_EXP_1C_WORDMARK_BT.png',
  'clg': 'https://static.lolesports.com/teams/1631819846666_CLG-logo.png',
  'nrg': 'https://static.lolesports.com/teams/1673992505588_NRG.png',
  'fpx': 'https://static.lolesports.com/teams/1631819923424_fpx-2021-logo.png',
  'lng': 'https://static.lolesports.com/teams/lng-new-logo.png',
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const urlObj = new URL(url);
          redirectUrl = urlObj.protocol + '//' + urlObj.host + redirectUrl;
        }
        download(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }

      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(TEAMS_DIR)) {
    fs.mkdirSync(TEAMS_DIR, { recursive: true });
  }

  const teams = Object.keys(TEAMS);
  console.log('Downloading ' + teams.length + ' team logos...');

  let downloaded = 0;
  let skipped = 0;
  let failed = [];

  for (const team of teams) {
    const url = TEAMS[team];
    const file = path.join(TEAMS_DIR, team + '.png');

    if (fs.existsSync(file) && fs.statSync(file).size > 100) {
      skipped++;
      continue;
    }

    try {
      await download(url, file);
      if (fs.existsSync(file) && fs.statSync(file).size > 100) {
        downloaded++;
        console.log('Downloaded: ' + team);
      } else {
        failed.push(team);
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    } catch (e) {
      failed.push(team);
      console.log('Failed ' + team + ': ' + e.message);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  console.log('\nDownloaded: ' + downloaded + ', Skipped: ' + skipped + ', Failed: ' + failed.length);
  if (failed.length > 0) {
    console.log('Failed teams: ' + failed.join(', '));
  }
}

main();
