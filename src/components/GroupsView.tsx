import { useMemo } from 'react';
import type {
  GroupLetter,
  Match,
  Participant,
  ParticipantScore,
  Team,
} from '../types';
import { computeGroupStandings, isMatchPlayed } from '../scoring';
import { ParticipantBadge } from './ParticipantBadge';

interface Lookups {
  teamById: Map<string, Team>;
  ownerByTeamId: Map<string, Participant>;
}

interface Props {
  teams: Team[];
  participants: Participant[];
  matches: Match[];
  scores: ParticipantScore[];
  lookups: Lookups;
}

const GROUPS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F',
  'G', 'H', 'I', 'J', 'K', 'L',
];

// Single landing view: leaderboard at the top, then 12 group cards
// below with their own standings tables and a read-only list of
// matches. There is no editing UI anywhere on the page.
export function GroupsView({
  teams,
  participants,
  matches,
  scores,
  lookups,
}: Props) {
  // Group teams + matches by group letter once. computeGroupStandings
  // is cheap, but slicing the matches once is still nicer.
  const byGroup = useMemo(() => {
    const map = new Map<
      GroupLetter,
      { teams: Team[]; matches: Match[] }
    >();
    for (const g of GROUPS) map.set(g, { teams: [], matches: [] });
    for (const t of teams) map.get(t.group)?.teams.push(t);
    for (const m of matches) {
      if (m.round !== 'group') continue;
      const team = teams.find((t) => t.id === m.teamA);
      if (team) map.get(team.group)?.matches.push(m);
    }
    return map;
  }, [teams, matches]);

  const participantById = new Map(participants.map((p) => [p.id, p]));

  return (
    <>
      {/* ---- Leaderboard ------------------------------------------- */}
      <section className="card leaderboard-card">
        <h3>Leaderboard</h3>
        <table className="leaderboard">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>CS</th>
              <th>GF</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => {
              const p = participantById.get(s.participantId);
              return (
                <tr key={s.participantId}>
                  <td>{i + 1}</td>
                  <td>
                    <ParticipantBadge participant={p} size="md" />
                  </td>
                  <td>{s.wins}</td>
                  <td>{s.draws}</td>
                  <td>{s.losses}</td>
                  <td>{s.cleanSheets}</td>
                  <td>{s.goalsFor}</td>
                  <td>
                    <strong>{s.total}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ---- 12 group cards --------------------------------------- */}
      <div className="group-grid">
        {GROUPS.map((g) => {
          const block = byGroup.get(g);
          if (!block) return null;
          const standings = computeGroupStandings(block.teams, block.matches);
          return (
            <section key={g} className="card group-card">
              <header className="group-header">
                <h3>Group {g}</h3>
              </header>

              <table className="standings">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Owner</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>GD</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const team = lookups.teamById.get(row.teamId);
                    const owner = lookups.ownerByTeamId.get(row.teamId);
                    return (
                      <tr key={row.teamId}>
                        <td>{i + 1}</td>
                        <td>
                          {team?.flag_emoji} {team?.name}
                        </td>
                        <td>
                          <ParticipantBadge participant={owner} />
                        </td>
                        <td>{row.played}</td>
                        <td>{row.wins}</td>
                        <td>{row.draws}</td>
                        <td>{row.losses}</td>
                        <td>{row.goalsFor}</td>
                        <td>{row.goalsAgainst}</td>
                        <td>{row.goalDiff}</td>
                        <td>
                          <strong>{row.points}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <ul className="match-list-readonly">
                {block.matches.map((m) => {
                  const a = lookups.teamById.get(m.teamA);
                  const b = lookups.teamById.get(m.teamB);
                  const ownerA = a
                    ? lookups.ownerByTeamId.get(a.id)
                    : undefined;
                  const ownerB = b
                    ? lookups.ownerByTeamId.get(b.id)
                    : undefined;
                  const played = isMatchPlayed(m);
                  return (
                    <li key={m.id} className="match-row-ro">
                      <span className="ro-team ro-team-left">
                        <ParticipantBadge participant={ownerA} />
                        <span>
                          {a?.flag_emoji} {a?.name}
                        </span>
                      </span>
                      <span
                        className={
                          played ? 'ro-score played' : 'ro-score unplayed'
                        }
                      >
                        {played ? `${m.scoreA} - ${m.scoreB}` : 'vs'}
                      </span>
                      <span className="ro-team ro-team-right">
                        <span>
                          {b?.name} {b?.flag_emoji}
                        </span>
                        <ParticipantBadge participant={ownerB} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
