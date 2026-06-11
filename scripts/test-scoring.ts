// Quick smoke test for the scoring engine. Not a real test suite.
// Run with: npm run test:scoring  (uses tsx)
//
// Verifies a hand-computed expected total against the seed data.

import seed from '../src/data/data.json' assert { type: 'json' };
import type { AppData } from '../src/types';
import { computeLeaderboard, pointsForTeamInMatch } from '../src/scoring';

const data = seed as AppData;

// 1. Sanity check pointsForTeamInMatch with a constructed match.
const sample = pointsForTeamInMatch(
  'BRA',
  {
    id: 'tmp',
    round: 'group',
    teamA: 'BRA',
    teamB: 'ARG',
    scoreA: 2,
    scoreB: 0,
    winner: 'BRA',
  },
  { win: 3, draw: 1, loss: 0, cleanSheet: 1, goalBonus: 1 },
);
const expected = 3 /*win*/ + 1 /*cleanSheet*/ + 2 /*goals*/;
if (sample.points !== expected) {
  throw new Error(
    `pointsForTeamInMatch expected ${expected}, got ${sample.points}`,
  );
}
console.log('pointsForTeamInMatch ok ->', sample);

// 2. Compute the seed leaderboard and print it.
const board = computeLeaderboard(
  data.participants,
  data.matches,
  data.scoringRules,
);
console.log('\nLeaderboard from seed data:');
for (const row of board) {
  const p = data.participants.find((x) => x.id === row.participantId);
  console.log(
    `${p?.name?.padEnd(8)}  total=${row.total}  W=${row.wins} D=${row.draws} ` +
      `L=${row.losses} CS=${row.cleanSheets} GF=${row.goalsFor}`,
  );
}

// 3. Sanity: every participant total should equal sum(perTeam.points).
for (const row of board) {
  const sum = row.perTeam.reduce((s, t) => s + t.points, 0);
  if (sum !== row.total) {
    throw new Error(
      `total mismatch for ${row.participantId}: ${row.total} vs sum ${sum}`,
    );
  }
}
console.log('\nall participant totals reconcile with their per-team breakdowns.');
