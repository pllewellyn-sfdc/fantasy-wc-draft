import { useMemo } from 'react';
import type { Match, Team, GroupLetter } from '../types';
import { computeGroupStandings } from '../scoring';
import { MatchEditor, type Lookups } from './MatchEditor';
import { ParticipantBadge } from './ParticipantBadge';

interface Props {
  teams: Team[];
  matches: Match[];
  lookups: Lookups;
  onMatchChange: (next: Match) => void;
}

const GROUPS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F',
  'G', 'H', 'I', 'J', 'K', 'L',
];

// Renders one card per group with its standings table on top and
// editable matches below. The standings table is purely derived
// (computeGroupStandings is pure) so as soon as a score changes in
// any MatchEditor below, the table above re-renders.
export function GroupStage({
  teams,
  matches,
  lookups,
  onMatchChange,
}: Props) {
  // Group teams + matches by group letter once, not on every child.
  const byGroup = useMemo(() => {
    const map = new Map<
      GroupLetter,
      { teams: Team[]; matches: Match[] }
    >();
    for (const g of GROUPS) {
      map.set(g, { teams: [], matches: [] });
    }
    for (const t of teams) {
      map.get(t.group)?.teams.push(t);
    }
    for (const m of matches) {
      if (m.round !== 'group') continue;
      const team = teams.find((t) => t.id === m.teamA);
      if (team) map.get(team.group)?.matches.push(m);
    }
    return map;
  }, [teams, matches]);

  return (
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

            <div className="match-list">
              {block.matches.map((m) => (
                <MatchEditor
                  key={m.id}
                  match={m}
                  lookups={lookups}
                  onChange={onMatchChange}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
