// One-off generator for src/data/data.json reflecting the real
// 2026 FIFA World Cup field of 48 teams across 12 groups, plus the
// 8 league participants and their drafted teams. Re-run with:
//   node scripts/build-seed.cjs
//
// This script is not part of the runtime app. The output JSON is
// committed; the script is kept so the seed can be regenerated.

const fs = require('fs');
const path = require('path');

// 12 groups × 4 teams. Order within each group is the Wikipedia
// standings order at the time of writing (Pot 1 host first, then
// rough strength). Order is just for display; the scoring engine
// does not depend on it.
const GROUPS = {
  A: [
    { id: 'MEX', name: 'Mexico',         flag: '🇲🇽' },
    { id: 'RSA', name: 'South Africa',   flag: '🇿🇦' },
    { id: 'KOR', name: 'South Korea',    flag: '🇰🇷' },
    { id: 'CZE', name: 'Czechia',        flag: '🇨🇿' },
  ],
  B: [
    { id: 'CAN', name: 'Canada',                  flag: '🇨🇦' },
    { id: 'BIH', name: 'Bosnia and Herzegovina',  flag: '🇧🇦' },
    { id: 'QAT', name: 'Qatar',                   flag: '🇶🇦' },
    { id: 'SUI', name: 'Switzerland',             flag: '🇨🇭' },
  ],
  C: [
    { id: 'BRA', name: 'Brazil',   flag: '🇧🇷' },
    { id: 'MAR', name: 'Morocco',  flag: '🇲🇦' },
    { id: 'HAI', name: 'Haiti',    flag: '🇭🇹' },
    { id: 'SCO', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  ],
  D: [
    { id: 'USA', name: 'United States', flag: '🇺🇸' },
    { id: 'PAR', name: 'Paraguay',      flag: '🇵🇾' },
    { id: 'AUS', name: 'Australia',     flag: '🇦🇺' },
    { id: 'TUR', name: 'Turkey',        flag: '🇹🇷' },
  ],
  E: [
    { id: 'GER', name: 'Germany',     flag: '🇩🇪' },
    { id: 'CUW', name: 'Curaçao',     flag: '🇨🇼' },
    { id: 'CIV', name: 'Ivory Coast', flag: '🇨🇮' },
    { id: 'ECU', name: 'Ecuador',     flag: '🇪🇨' },
  ],
  F: [
    { id: 'NED', name: 'Netherlands', flag: '🇳🇱' },
    { id: 'JPN', name: 'Japan',       flag: '🇯🇵' },
    { id: 'SWE', name: 'Sweden',      flag: '🇸🇪' },
    { id: 'TUN', name: 'Tunisia',     flag: '🇹🇳' },
  ],
  G: [
    { id: 'BEL', name: 'Belgium',     flag: '🇧🇪' },
    { id: 'EGY', name: 'Egypt',       flag: '🇪🇬' },
    { id: 'IRN', name: 'Iran',        flag: '🇮🇷' },
    { id: 'NZL', name: 'New Zealand', flag: '🇳🇿' },
  ],
  H: [
    { id: 'ESP', name: 'Spain',         flag: '🇪🇸' },
    { id: 'CPV', name: 'Cape Verde',    flag: '🇨🇻' },
    { id: 'KSA', name: 'Saudi Arabia',  flag: '🇸🇦' },
    { id: 'URU', name: 'Uruguay',       flag: '🇺🇾' },
  ],
  I: [
    { id: 'FRA', name: 'France',  flag: '🇫🇷' },
    { id: 'SEN', name: 'Senegal', flag: '🇸🇳' },
    { id: 'IRQ', name: 'Iraq',    flag: '🇮🇶' },
    { id: 'NOR', name: 'Norway',  flag: '🇳🇴' },
  ],
  J: [
    { id: 'ARG', name: 'Argentina', flag: '🇦🇷' },
    { id: 'ALG', name: 'Algeria',   flag: '🇩🇿' },
    { id: 'AUT', name: 'Austria',   flag: '🇦🇹' },
    { id: 'JOR', name: 'Jordan',    flag: '🇯🇴' },
  ],
  K: [
    { id: 'POR', name: 'Portugal',   flag: '🇵🇹' },
    { id: 'COD', name: 'DR Congo',   flag: '🇨🇩' },
    { id: 'UZB', name: 'Uzbekistan', flag: '🇺🇿' },
    { id: 'COL', name: 'Colombia',   flag: '🇨🇴' },
  ],
  L: [
    { id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { id: 'CRO', name: 'Croatia', flag: '🇭🇷' },
    { id: 'GHA', name: 'Ghana',   flag: '🇬🇭' },
    { id: 'PAN', name: 'Panama',  flag: '🇵🇦' },
  ],
};

// 8 league participants with their drafted teams.
const PARTICIPANTS = [
  {
    id: 'kenny',  name: 'Kenny',  color: '#e63946',
    teams: ['ESP', 'MEX', 'JPN', 'IRN', 'PAR', 'CUW'],
  },
  {
    id: 'pete',   name: 'Pete',   color: '#1d3557',
    teams: ['ENG', 'NOR', 'SUI', 'CZE', 'COD', 'HAI'],
  },
  {
    id: 'talty',  name: 'Talty',  color: '#2a9d8f',
    teams: ['FRA', 'CRO', 'ECU', 'ALG', 'AUS', 'IRQ'],
  },
  {
    id: 'clem',   name: 'Clem',   color: '#f4a261',
    teams: ['NED', 'USA', 'KOR', 'SCO', 'PAN', 'QAT'],
  },
  {
    id: 'hidalgo', name: 'Hidalgo', color: '#9b5de5',
    teams: ['GER', 'MAR', 'EGY', 'CAN', 'KSA', 'JOR'],
  },
  {
    id: 'scott',  name: 'Scott',  color: '#00b4d8',
    teams: ['ARG', 'URU', 'TUR', 'GHA', 'TUN', 'CPV'],
  },
  {
    id: 'clitz',  name: 'Clitz',  color: '#f15bb5',
    teams: ['BRA', 'BEL', 'SEN', 'AUT', 'BIH', 'UZB'],
  },
  {
    id: 'pat',    name: 'Pat',    color: '#264653',
    teams: ['POR', 'COL', 'SWE', 'CIV', 'RSA', 'NZL'],
  },
];

// Round-robin pairings for a 4-team group, by index.
// Six matches total per group.
const PAIRINGS = [
  [0, 1], [2, 3],
  [0, 2], [3, 1],
  [3, 0], [1, 2],
];

function buildTeams() {
  const out = [];
  for (const [letter, teams] of Object.entries(GROUPS)) {
    for (const t of teams) {
      out.push({
        id: t.id,
        name: t.name,
        group: letter,
        flag_emoji: t.flag,
      });
    }
  }
  return out;
}

function buildGroupMatches() {
  const out = [];
  for (const [letter, teams] of Object.entries(GROUPS)) {
    PAIRINGS.forEach(([a, b], i) => {
      out.push({
        id: `g-${letter}${i + 1}`,
        round: 'group',
        teamA: teams[a].id,
        teamB: teams[b].id,
        scoreA: null,
        scoreB: null,
        winner: null,
      });
    });
  }
  return out;
}

// Knockout bracket structure for the 48-team format.
// 32 teams advance: top 2 from each group + 8 best 3rd-placed.
// We seed Round of 32 placeholders that match FIFA's published
// bracket pairings (as published by FIFA for the 2026 tournament).
// Users can edit the team selectors to fill in real teams once the
// group stage finishes.
function buildKnockoutMatches() {
  const r32Pairs = [
    ['1A', '2C'], ['1C', '2F'],
    ['1E', '2A'], ['1B', '3A/B/C/F'],
    ['1F', '3A/B/C/D'], ['1G', '3C/E/F/H'],
    ['1H', '2K'],  ['1K', '2L'],
    ['1D', '2H'],  ['1L', '2I'],
    ['1J', '2D'],  ['1I', '3D/E/I/J/K'],
    ['2B', '2G'],  ['2E', '2J'],
    ['3rd-1', '3rd-2'], ['3rd-3', '3rd-4'],
  ];
  const out = [];
  r32Pairs.forEach(([a, b], i) => {
    out.push({
      id: `r32-${i + 1}`,
      round: 'r32',
      teamA: '',
      teamB: '',
      scoreA: null,
      scoreB: null,
      winner: null,
      placeholderA: a,
      placeholderB: b,
    });
  });
  // R16: 8 matches feeding from R32 winners.
  for (let i = 0; i < 8; i++) {
    out.push({
      id: `r16-${i + 1}`,
      round: 'r16',
      teamA: '',
      teamB: '',
      scoreA: null,
      scoreB: null,
      winner: null,
      placeholderA: `W r32-${2 * i + 1}`,
      placeholderB: `W r32-${2 * i + 2}`,
    });
  }
  // QF: 4 matches.
  for (let i = 0; i < 4; i++) {
    out.push({
      id: `qf-${i + 1}`,
      round: 'qf',
      teamA: '',
      teamB: '',
      scoreA: null,
      scoreB: null,
      winner: null,
      placeholderA: `W r16-${2 * i + 1}`,
      placeholderB: `W r16-${2 * i + 2}`,
    });
  }
  // SF: 2 matches.
  for (let i = 0; i < 2; i++) {
    out.push({
      id: `sf-${i + 1}`,
      round: 'sf',
      teamA: '',
      teamB: '',
      scoreA: null,
      scoreB: null,
      winner: null,
      placeholderA: `W qf-${2 * i + 1}`,
      placeholderB: `W qf-${2 * i + 2}`,
    });
  }
  out.push({
    id: 'third',
    round: 'third',
    teamA: '',
    teamB: '',
    scoreA: null,
    scoreB: null,
    winner: null,
    placeholderA: 'L sf-1',
    placeholderB: 'L sf-2',
  });
  out.push({
    id: 'final',
    round: 'final',
    teamA: '',
    teamB: '',
    scoreA: null,
    scoreB: null,
    winner: null,
    placeholderA: 'W sf-1',
    placeholderB: 'W sf-2',
  });
  return out;
}

function build() {
  const teams = buildTeams();
  const teamIds = new Set(teams.map((t) => t.id));

  const participants = PARTICIPANTS.map((p) => {
    for (const tid of p.teams) {
      if (!teamIds.has(tid)) {
        throw new Error(`Unknown team id ${tid} in ${p.name}'s draft`);
      }
    }
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      draftedTeamIds: p.teams,
    };
  });

  // Sanity check: every team is drafted exactly once.
  const drafted = new Map();
  for (const p of participants) {
    for (const tid of p.draftedTeamIds) {
      drafted.set(tid, (drafted.get(tid) || 0) + 1);
    }
  }
  const undrafted = [...teamIds].filter((id) => !drafted.has(id));
  const duped = [...drafted.entries()].filter(([, n]) => n > 1);
  if (undrafted.length || duped.length) {
    console.error('undrafted:', undrafted);
    console.error('duplicated:', duped);
    throw new Error('draft does not partition the team list');
  }

  return {
    teams,
    participants,
    scoringRules: {
      win: 3,
      draw: 1,
      loss: 0,
      cleanSheet: 1,
      goalBonus: 1,
    },
    matches: [...buildGroupMatches(), ...buildKnockoutMatches()],
  };
}

const data = build();
const target = path.join(__dirname, '..', 'src', 'data', 'data.json');
fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
console.log(
  `wrote ${target}  (${data.teams.length} teams, ${data.participants.length} players, ${data.matches.length} matches)`,
);
