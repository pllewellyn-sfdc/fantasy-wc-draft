// Pure scoring engine.
//
// Given the full app state (matches, participants, scoringRules), it
// returns a sorted leaderboard with per-team breakdowns. The function
// has no side effects so it can be called from a useMemo in React or
// from a Node script for testing without changes.
//
// Scoring is computed per match: every drafted team that played a
// match with both scores filled in earns points based on the result.
// Goals scored, clean sheets, and the win/draw/loss bucket are all
// configurable through ScoringRules.

import type {
  Match,
  Participant,
  ParticipantScore,
  ScoringRules,
} from './types';

/**
 * Returns true when both scores are present and the match has a teamA
 * and teamB assigned. Knockout matches that are still placeholders are
 * filtered out so they do not contribute zero-goal "clean sheets".
 */
export function isMatchPlayed(match: Match): boolean {
  return (
    match.scoreA !== null &&
    match.scoreB !== null &&
    match.teamA !== '' &&
    match.teamB !== ''
  );
}

/**
 * Compute the points a single team earned in a single match.
 * Returns 0 if the team did not play in this match.
 */
export function pointsForTeamInMatch(
  teamId: string,
  match: Match,
  rules: ScoringRules,
): {
  points: number;
  played: boolean;
  win: boolean;
  draw: boolean;
  loss: boolean;
  cleanSheet: boolean;
  goalsFor: number;
} {
  const empty = {
    points: 0,
    played: false,
    win: false,
    draw: false,
    loss: false,
    cleanSheet: false,
    goalsFor: 0,
  };
  if (!isMatchPlayed(match)) return empty;

  const isA = match.teamA === teamId;
  const isB = match.teamB === teamId;
  if (!isA && !isB) return empty;

  // We've checked isMatchPlayed so scores are non-null.
  const scoreFor = (isA ? match.scoreA : match.scoreB) as number;
  const scoreAgainst = (isA ? match.scoreB : match.scoreA) as number;

  const win = match.winner === teamId;
  const draw = match.winner === 'draw';
  const loss = !win && !draw;
  const cleanSheet = scoreAgainst === 0;

  let points = 0;
  if (win) points += rules.win;
  else if (draw) points += rules.draw;
  else points += rules.loss;
  if (cleanSheet) points += rules.cleanSheet;
  points += rules.goalBonus * scoreFor;

  return {
    points,
    played: true,
    win,
    draw,
    loss,
    cleanSheet,
    goalsFor: scoreFor,
  };
}

/**
 * Build the full leaderboard. Sorted by total descending, then by
 * goals scored (a common tie-breaker), then alphabetically by name.
 */
export function computeLeaderboard(
  participants: Participant[],
  matches: Match[],
  rules: ScoringRules,
): ParticipantScore[] {
  const scores: ParticipantScore[] = participants.map((p) => {
    const perTeam = p.draftedTeamIds.map((teamId) => {
      let points = 0;
      let matchesPlayed = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let cleanSheets = 0;
      let goalsFor = 0;

      for (const m of matches) {
        const r = pointsForTeamInMatch(teamId, m, rules);
        if (!r.played) continue;
        matchesPlayed += 1;
        points += r.points;
        if (r.win) wins += 1;
        if (r.draw) draws += 1;
        if (r.loss) losses += 1;
        if (r.cleanSheet) cleanSheets += 1;
        goalsFor += r.goalsFor;
      }

      return {
        teamId,
        points,
        matchesPlayed,
        wins,
        draws,
        losses,
        cleanSheets,
        goalsFor,
      };
    });

    const total = perTeam.reduce((s, t) => s + t.points, 0);
    const wins = perTeam.reduce((s, t) => s + t.wins, 0);
    const draws = perTeam.reduce((s, t) => s + t.draws, 0);
    const losses = perTeam.reduce((s, t) => s + t.losses, 0);
    const cleanSheets = perTeam.reduce((s, t) => s + t.cleanSheets, 0);
    const goalsFor = perTeam.reduce((s, t) => s + t.goalsFor, 0);

    return {
      participantId: p.id,
      total,
      wins,
      draws,
      losses,
      cleanSheets,
      goalsFor,
      perTeam,
    };
  });

  // Sort: total desc, goalsFor desc, then name asc for stable order.
  const byId = new Map(participants.map((p) => [p.id, p]));
  scores.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const an = byId.get(a.participantId)?.name ?? '';
    const bn = byId.get(b.participantId)?.name ?? '';
    return an.localeCompare(bn);
  });

  return scores;
}

/**
 * Compute group standings (W/D/L/GF/GA/GD/Pts) using football's
 * standard 3/1/0 system, regardless of the fantasy ScoringRules.
 * Used by the GroupStage UI to mirror real-world standings.
 */
export interface GroupStanding {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export function computeGroupStandings(
  groupTeams: { id: string }[],
  matches: Match[],
): GroupStanding[] {
  const table = new Map<string, GroupStanding>();
  for (const t of groupTeams) {
    table.set(t.id, {
      teamId: t.id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    if (m.round !== 'group') continue;
    if (!isMatchPlayed(m)) continue;
    const a = table.get(m.teamA);
    const b = table.get(m.teamB);
    if (!a || !b) continue;
    const sa = m.scoreA as number;
    const sb = m.scoreB as number;
    a.played += 1;
    b.played += 1;
    a.goalsFor += sa;
    a.goalsAgainst += sb;
    b.goalsFor += sb;
    b.goalsAgainst += sa;
    if (m.winner === 'draw') {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    } else if (m.winner === a.teamId) {
      a.wins += 1;
      b.losses += 1;
      a.points += 3;
    } else if (m.winner === b.teamId) {
      b.wins += 1;
      a.losses += 1;
      b.points += 3;
    }
  }

  for (const row of table.values()) {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
}
