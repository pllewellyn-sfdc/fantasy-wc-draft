// Pull live FIFA World Cup scores from ESPN's public scoreboard
// endpoint and patch them into src/data/data.json. Designed to run
// from a GitHub Actions cron job, but also runnable locally with
// `node scripts/update-scores.cjs`.
//
// Defensive design: this script NEVER throws on a network error, an
// unrecognised team, or a date with no games. It always exits 0 so a
// transient ESPN hiccup doesn't break the deploy. If nothing
// changed, data.json is untouched and the workflow's `git diff`
// guard skips the commit.

const fs = require('fs');
const path = require('path');
const https = require('https');

// ESPN's free FIFA World Cup scoreboard. No API key, no auth.
// `dates=YYYYMMDD-YYYYMMDD` requests a date range; we use the full
// 2026 tournament window so a single call returns everything.
const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260601-20260801';

// Map ESPN team abbreviations to our internal IDs. Most match the
// 3-letter FIFA codes already, but a few federations use different
// abbreviations on ESPN.
const ESPN_TO_OURS = {
  ALG: 'ALG', ARG: 'ARG', AUS: 'AUS', AUT: 'AUT',
  BEL: 'BEL', BIH: 'BIH', BRA: 'BRA',
  CAN: 'CAN', CIV: 'CIV', COD: 'COD', COL: 'COL',
  CPV: 'CPV', CRO: 'CRO', CUW: 'CUW', CZE: 'CZE',
  // ESPN sometimes uses CRC for Czech Republic in older feeds; the
  // 2026 feed uses CZE. We map both to be safe.
  ECU: 'ECU', EGY: 'EGY', ENG: 'ENG', ESP: 'ESP',
  FRA: 'FRA',
  GER: 'GER', GHA: 'GHA',
  // Haiti is often "HAI" on ESPN, occasionally "HTI".
  HAI: 'HAI', HTI: 'HAI',
  IRN: 'IRN', IRQ: 'IRQ',
  JPN: 'JPN', JOR: 'JOR',
  KOR: 'KOR', KSA: 'KSA',
  MAR: 'MAR', MEX: 'MEX',
  NED: 'NED', NOR: 'NOR', NZL: 'NZL',
  PAN: 'PAN', PAR: 'PAR', POR: 'POR',
  QAT: 'QAT',
  RSA: 'RSA',
  SCO: 'SCO', SEN: 'SEN', SUI: 'SUI', SWE: 'SWE',
  TUN: 'TUN', TUR: 'TUR',
  URU: 'URU', USA: 'USA', UZB: 'UZB',
  // Defensive aliases:
  DRC: 'COD', // Democratic Republic of Congo, alt code
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          // ESPN sometimes 403s default Node user-agents.
          'User-Agent':
            'Mozilla/5.0 (compatible; FantasyWCBot/1.0; +https://github.com/)',
          Accept: 'application/json',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error('HTTP ' + res.statusCode));
          return;
        }
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('ESPN request timed out'));
    });
  });
}

function safeRun() {
  return main().catch((err) => {
    console.error('update-scores: bailing out without changes:', err.message);
    process.exit(0);
  });
}

async function main() {
  const dataPath = path.join(__dirname, '..', 'src', 'data', 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  let espn;
  try {
    espn = await fetchJson(ESPN_URL);
  } catch (err) {
    console.warn('Could not reach ESPN:', err.message);
    return;
  }

  const events = Array.isArray(espn?.events) ? espn.events : [];
  console.log(`ESPN returned ${events.length} events`);

  let updated = 0;
  const unknownTeams = new Set();

  for (const ev of events) {
    const competition = ev.competitions && ev.competitions[0];
    if (!competition) continue;

    const state = competition.status?.type?.state;
    const completed = competition.status?.type?.completed === true;

    const competitors = competition.competitors || [];
    if (competitors.length !== 2) continue;

    const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];

    const homeAbbr = home?.team?.abbreviation;
    const awayAbbr = away?.team?.abbreviation;
    const homeId = ESPN_TO_OURS[homeAbbr];
    const awayId = ESPN_TO_OURS[awayAbbr];

    if (!homeId) unknownTeams.add(homeAbbr);
    if (!awayId) unknownTeams.add(awayAbbr);
    if (!homeId || !awayId) continue;

    // Find a group-stage match between these two teams in our data.
    // We don't yet auto-update knockout matches because their teamA/
    // teamB slots start empty.
    const match = data.matches.find(
      (m) =>
        m.round === 'group' &&
        ((m.teamA === homeId && m.teamB === awayId) ||
          (m.teamA === awayId && m.teamB === homeId)),
    );
    if (!match) continue;

    // Always update kickoff. ESPN returns the scheduled date as an
    // ISO 8601 string on every event, even for unplayed matches.
    const kickoff = competition.date || ev.date;
    if (kickoff && match.kickoff !== kickoff) {
      match.kickoff = kickoff;
      updated += 1;
    }

    // Always update TV channel. ESPN's geoBroadcasts is an array of
    // per-region broadcasters. Prefer a US English entry; fall back
    // to the first one available; finally try the lighter
    // `broadcasts` field.
    const geo = Array.isArray(competition.geoBroadcasts)
      ? competition.geoBroadcasts
      : [];
    const usEn = geo.find(
      (g) =>
        (g?.region === 'us' || g?.market?.type === 'Home') &&
        g?.lang === 'en',
    );
    const usAny = geo.find(
      (g) => g?.region === 'us' || g?.market?.type === 'Home',
    );
    const broadcastsArr = Array.isArray(competition.broadcasts)
      ? competition.broadcasts
      : [];
    const fallbackName =
      broadcastsArr[0]?.names?.[0] || broadcastsArr[0]?.name || null;
    const tvChannel =
      usEn?.media?.shortName ||
      usAny?.media?.shortName ||
      geo[0]?.media?.shortName ||
      fallbackName ||
      null;
    if (tvChannel && match.tvChannel !== tvChannel) {
      match.tvChannel = tvChannel;
      updated += 1;
    }

    // Only update score/winner for matches that are in progress or
    // completed. Skip pre-game so we don't blank scores or stamp a
    // winner before kickoff.
    if (state !== 'in' && !completed) continue;

    const homeScore = parseInt(home.score, 10);
    const awayScore = parseInt(away.score, 10);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;

    let newScoreA;
    let newScoreB;
    if (match.teamA === homeId) {
      newScoreA = homeScore;
      newScoreB = awayScore;
    } else {
      newScoreA = awayScore;
      newScoreB = homeScore;
    }

    let winner = null;
    if (completed) {
      if (newScoreA > newScoreB) winner = match.teamA;
      else if (newScoreB > newScoreA) winner = match.teamB;
      else winner = 'draw';
    }

    if (
      match.scoreA !== newScoreA ||
      match.scoreB !== newScoreB ||
      match.winner !== winner
    ) {
      match.scoreA = newScoreA;
      match.scoreB = newScoreB;
      match.winner = winner;
      updated += 1;
      console.log(
        `Updated ${match.id}: ${homeAbbr} ${homeScore}-${awayScore} ${awayAbbr} (${
          completed ? 'final' : 'in progress'
        })`,
      );
    }
  }

  if (unknownTeams.size > 0) {
    console.warn(
      'Unknown ESPN team abbreviations (extend ESPN_TO_OURS):',
      [...unknownTeams].join(', '),
    );
  }

  if (updated > 0) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Wrote ${updated} updated match(es) to data.json`);
  } else {
    console.log('No score changes');
  }
}

safeRun();