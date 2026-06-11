import type { Match, Round, Team } from '../types';
import { MatchEditor, type Lookups } from './MatchEditor';

interface Props {
  teams: Team[];
  matches: Match[];
  lookups: Lookups;
  onMatchChange: (next: Match) => void;
}

const ROUND_ORDER: Round[] = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];
const ROUND_LABEL: Record<Round, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  third: 'Third-place match',
  final: 'Final',
};

// Knockout matches have empty teamA/teamB until the user fills them
// in. The selectableTeams list is the full team roster; in a real
// tournament you would constrain this to the surviving teams, but a
// permissive picker keeps the data model simple and lets users
// recover from data-entry mistakes.
export function KnockoutBracket({
  teams,
  matches,
  lookups,
  onMatchChange,
}: Props) {
  const koMatches = matches.filter((m) => m.round !== 'group');
  return (
    <div className="bracket">
      {ROUND_ORDER.map((round) => {
        const rows = koMatches.filter((m) => m.round === round);
        if (rows.length === 0) return null;
        return (
          <section key={round} className="card bracket-round">
            <h3>{ROUND_LABEL[round]}</h3>
            <div className="match-list">
              {rows.map((m) => (
                <MatchEditor
                  key={m.id}
                  match={m}
                  lookups={lookups}
                  selectableTeams={teams}
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
