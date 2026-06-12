// Pull live FIFA World Cup scores from ESPN's public scoreboard
// endpoint and patch them into src/data/data.json. Designed to run
// from a GitHub Actions cron job, but also runnable locally with
// `node scripts/update-scores.cjs`.
//
// Why we iterate day-by-day:
// ESPN's scoreboard endpoint accepts a date filter, but in practice
// large date ranges return only some events or none at all,
// depending on the league. A per-day loop over the tournament
// window is bulletproof and the extra ~40 small requests per cron
// tick are fine on a public repo.
//
// Defensive design: this script NEVER throws on a network error, an
// unrecognised team, or a date with no games. It always exits 0 so
// a transient ESPN hiccup doesn't break the deploy.
 
const fs = require('fs');
const path = require('path');
const https = require('https');
 
// 2026 World Cup window (Wikipedia: Jun 11 group stage opener →
// Jul 19 final). We iterate inclusive of both ends.
const TOURNAMENT_START = '2026-06-11';
const TOURNAMENT_END = '2026-07-19';
 
const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
 
// Map ESPN team abbreviations to our internal IDs.
const ESPN_TO_OURS = {
  ALG: 'ALG', ARG: 'ARG', AUS: 'AUS', AUT: 'AUT',
  BEL: 'BEL', BIH: 'BIH', BRA: 'BRA',
  CAN: 'CAN', CIV: 'CIV', COD: 'COD', COL: 'COL',
  CPV: 'CPV', CRO: 'CRO', CUW: 'CUW', CZE: 'CZE',
  ECU: 'ECU', EGY: 'EGY', ENG: 'ENG', ESP: 'ESP',
  FRA: 'FRA',
  GER: 'GER', GHA: 'GHA',
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
  DRC: 'COD',
};
 
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
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
 
// Yield each YYYYMMDD string between start and end inclusive.
function* eachDay(startIso, endIso) {
  const start = new Date(startIso + 'T00:00:00Z');
  const end = new Date(endIso + 'T00:00:00Z');
  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    yield '' + y + m + day;
  }
}
 
async function fetchEventsForDay(yyyymmdd) {
  const url = ESPN_BASE + '?dates=' + yyyymmdd;
  try {
    const json = await fetchJson(url);
    return Array.isArray(json?.events) ? json.events : [];
  } catch (err) {
    console.warn('  [' + yyyymmdd + '] fetch failed: ' + err.message);
    return [];
  }
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
 
  let totalEvents = 0;
  let updated = 0;
  const unknownTeams = new Set();
 
  console.log('Polling ESPN day-by-day from', TOURNAMENT_START, 'to', TOURNAMENT_END);
 
  for (const ymd of eachDay(TOURNAMENT_START, TOURNAMENT_END)) {
    const events = await fetchEventsForDay(ymd);
    if (events.length === 0) continue;
    totalEvents += events.length;
    console.log('  [' + ymd + '] ' + events.length + ' event(s)');
 
    for (const ev of events) {
      const competition = ev.competitions && ev.competitions[0];
      if (!competition) continue;
 
      const state = competition.status?.type?.state;
      const completed = competition.status?.type?.completed === true;
 
      const competitors = competition.competitors || [];
      if (competitors.length !== 2) continue;
 
      const home =
        competitors.find((c) => c.homeAway === 'home') || competitors[0];
      const away =
        competitors.find((c) => c.homeAway === 'away') || competitors[1];
 
      const homeAbbr = home?.team?.abbreviation;
      const awayAbbr = away?.team?.abbreviation;
      const homeId = ESPN_TO_OURS[homeAbbr];
      const awayId = ESPN_TO_OURS[awayAbbr];
 
      if (!homeId) unknownTeams.add(homeAbbr);
      if (!awayId) unknownTeams.add(awayAbbr);
      if (!homeId || !awayId) continue;
 
      // Find a matching match in our data. Group stage first; if
      // not a group fixture (e.g. a knockout), match by any teamA/B
      // pairing in the same round.
      const groupMatch = data.matches.find(
        (m) =>
          m.round === 'group' &&
          ((m.teamA === homeId && m.teamB === awayId) ||
            (m.teamA === awayId && m.teamB === homeId)),
      );
      const match = groupMatch;
      if (!match) {
        console.log(
          '    no group fixture for ' + homeAbbr + ' vs ' + awayAbbr,
        );
        continue;
      }
 
      // Always update kickoff.
      const kickoff = competition.date || ev.date;
      if (kickoff && match.kickoff !== kickoff) {
        match.kickoff = kickoff;
        updated += 1;
      }
 
      // Always update state ("pre" / "in" / "post").
      if (state && match.state !== state) {
        match.state = state;
        updated += 1;
      }
 
      // TV channel (US English preferred).
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
 
      // Score / winner only when in progress or completed.
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
          '    Updated ' +
            match.id +
            ': ' +
            homeAbbr +
            ' ' +
            homeScore +
            '-' +
            awayScore +
            ' ' +
            awayAbbr +
            ' (' +
            (completed ? 'final' : 'in progress') +
            ')',
        );
      }
    }
  }
 
  console.log(
    'Summary: ' + totalEvents + ' total events seen, ' + updated + ' field(s) updated',
  );
  if (unknownTeams.size > 0) {
    console.warn(
      'Unknown ESPN abbreviations (extend ESPN_TO_OURS):',
      [...unknownTeams].filter(Boolean).join(', '),
    );
  }
 
  if (updated > 0) {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    console.log('Wrote ' + updated + ' field(s) to data.json');
  } else {
    console.log('No changes');
  }
}
 
safeRun();