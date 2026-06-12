// Pure scoring engine.
//
// Given the full app state (matches, participants, scoringRules), it
// returns a sorted leaderboard with per-team breakdowns. The function
// has no side effects so it can be called from a useMemo in React or
// from a Node script for testing without changes.
//
// League scoring system:
//   - Group stage: per-match W/D/L using groupWin / groupDraw / groupLoss.
//   - Advancement bonuses (additive as a team progresses):
//       reachR32, reachQF, reachSF, reachFinal, champion.
//     R16 has no bonus of its own; reaching the QF implies the team
//     survived R16.
//   - Third-place playoff: thirdPlaceWin to the winner.
//   - Tiebreakers: total points → goals scored → goal difference → wins.
 
import type {
  Match,
  Participant,
  ParticipantScore,
  ScoringRules,
  Team,
} from './types';
 
/**
 * True iff both scores are present and the match has both team
 * slots filled.
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
 * Returns the set of team ids that appear in any match of a given
 * round. A team "reaches" a round once it shows up in that round's
 * bracket, regardless of whether the match itself has been played.
 */
function teamIdsInRound(matches: Match[], round: Match['round']): Set<string> {
  const set = new Set<string>();
  for (const m of matches) {
    if (m.round !== round) continue;
    if (m.teamA) set.add(m.teamA);
    if (m.teamB) set.add(m.teamB);
  }
  return set;
}
 
/**
 * Compute the per-match group-stage points for one team in one
 * match, plus stat counters needed for the leaderboard. Returns
 * zeroes if the match isn't a group-stage match the team played in.
 */
export function pointsForTeamInGroupMatch(
  teamId: string,
  match: Match,
  rules: ScoringRules,
): {
  points: number;
  played: boolean;
  win: boolean;
  draw: boolean;
  loss: boolean;
  goalsFor: number;
  goalsAgainst: number;
} {
  const empty = {
    points: 0,
    played: false,
    win: false,
    draw: false,
    loss: false,
    goalsFor: 0,
    goalsAgainst: 0,
  };
  if (match.round !== 'group') return empty;
  if (!isMatchPlayed(match)) return empty;
  const isA = match.teamA === teamId;
  const isB = match.teamB === teamId;
  if (!isA && !isB) return empty;
 
  const scoreFor = (isA ? match.scoreA : match.scoreB) as number;
  const scoreAgainst = (isA ? match.scoreB : match.scoreA) as number;
 
  const win = match.winner === teamId;
  const draw = match.winner === 'draw';
  const loss = !win && !draw;
 
  let points = 0;
  if (win) points += rules.groupWin;
  else if (draw) points += rules.groupDraw;
  else points += rules.groupLoss;
 
  return {
    points,
    played: true,
    win,
    draw,
    loss,
    goalsFor: scoreFor,
    goalsAgainst: scoreAgainst,
  };
}
 
/**
 * Compute the advancement-bonus subtotal for one team given the full
 * matches array. Walks each knockout round and sums the bonuses.
 */
export function bonusPointsForTeam(
  teamId: string,
  matches: Match[],
  rules: ScoringRules,
): number {
  let bonus = 0;
  if (teamIdsInRound(matches, 'r32').has(teamId)) bonus += rules.reachR32;
  if (teamIdsInRound(matches, 'qf').has(teamId)) bonus += rules.reachQF;
  if (teamIdsInRound(matches, 'sf').has(teamId)) bonus += rules.reachSF;
  if (teamIdsInRound(matches, 'final').has(teamId)) bonus += rules.reachFinal;
  // Champion: winner of the final fixture.
  const finalMatch = matches.find((m) => m.round === 'final');
  if (
    finalMatch &&
    finalMatch.winner !== null &&
    finalMatch.winner !== 'draw' &&
    finalMatch.winner === teamId
  ) {
    bonus += rules.champion;
  }
  // Third-place winner.
  const thirdMatch = matches.find((m) => m.round === 'third');
  if (
    thirdMatch &&
    thirdMatch.winner !== null &&
    thirdMatch.winner !== 'draw' &&
    thirdMatch.winner === teamId
  ) {
    bonus += rules.thirdPlaceWin;
  }
  return bonus;
}
 
/**
 * Build the full leaderboard. Sorted by total DESC, then goals
 * scored DESC, then goal difference DESC, then wins DESC.
 */
export function computeLeaderboard(
  participants: Participant[],
  matches: Match[],
  rules: ScoringRules,
): ParticipantScore[] {
  const scores: ParticipantScore[] = participants.map((p) => {
    const perTeam = p.draftedTeamIds.map((teamId) => {
      let groupPoints = 0;
      let matchesPlayed = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
 
      for (const m of matches) {
        const r = pointsForTeamInGroupMatch(teamId, m, rules);
        if (!r.played) continue;
        matchesPlayed += 1;
        groupPoints += r.points;
        if (r.win) wins += 1;
        if (r.draw) draws += 1;
        if (r.loss) losses += 1;
        goalsFor += r.goalsFor;
        goalsAgainst += r.goalsAgainst;
      }
 
      const bp = bonusPointsForTeam(teamId, matches, rules);
      return {
        teamId,
        points: groupPoints + bp,
        groupPoints,
        bonusPoints: bp,
        matchesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
      };
    });
 
    const total = perTeam.reduce((s, t) => s + t.points, 0);
    const wins = perTeam.reduce((s, t) => s + t.wins, 0);
    const draws = perTeam.reduce((s, t) => s + t.draws, 0);
    const losses = perTeam.reduce((s, t) => s + t.losses, 0);
    const goalsFor = perTeam.reduce((s, t) => s + t.goalsFor, 0);
    const goalsAgainst = perTeam.reduce((s, t) => s + t.goalsAgainst, 0);
    const bonusPoints = perTeam.reduce((s, t) => s + t.bonusPoints, 0);
 
    return {
      participantId: p.id,
      total,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst,
      bonusPoints,
      perTeam,
    };
  });
 
  // League tiebreakers: total → goals scored → goal diff → wins.
  // Final tiebreaker is name asc for stable order.
  const byId = new Map(participants.map((p) => [p.id, p]));
  scores.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    const an = byId.get(a.participantId)?.name ?? '';
    const bn = byId.get(b.participantId)?.name ?? '';
    return an.localeCompare(bn);
  });
 
  return scores;
}
 
/**
 * Standings table for one group, using football's standard 3/1/0
 * regardless of the fantasy ScoringRules. Used by GroupsView so the
 * displayed group standings mirror real-world tables.
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