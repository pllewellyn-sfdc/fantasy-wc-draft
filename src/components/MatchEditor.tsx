import type { Match, Team, Participant } from '../types';
import { ParticipantBadge } from './ParticipantBadge';

// Lookup map type so the parent does not have to rebuild it on every
// render. App.tsx memoizes these once and threads them down.
export interface Lookups {
  teamById: Map<string, Team>;
  ownerByTeamId: Map<string, Participant>;
}

interface Props {
  match: Match;
  lookups: Lookups;
  // Knockout matches let the user pick which team fills each slot.
  // For group matches the team ids are fixed and these dropdowns are
  // hidden.
  selectableTeams?: Team[];
  onChange: (next: Match) => void;
}

// Inline match editor. Score and winner are always editable. For
// knockout matches the user can also choose which team fills each
// slot from the full team list (driven by `selectableTeams`).
//
// State lives in the parent: this component only emits onChange with
// the next Match object. Keeping editors stateless keeps every
// visible score in lockstep with the leaderboard.
export function MatchEditor({
  match,
  lookups,
  selectableTeams,
  onChange,
}: Props) {
  const teamA = lookups.teamById.get(match.teamA);
  const teamB = lookups.teamById.get(match.teamB);
  const ownerA = teamA ? lookups.ownerByTeamId.get(teamA.id) : undefined;
  const ownerB = teamB ? lookups.ownerByTeamId.get(teamB.id) : undefined;

  const updateScore = (side: 'A' | 'B', raw: string) => {
    const n = raw === '' ? null : Number(raw);
    const scoreA = side === 'A' ? n : match.scoreA;
    const scoreB = side === 'B' ? n : match.scoreB;
    // Auto-derive winner whenever both scores are present so the
    // leaderboard stays correct even if the user does not touch the
    // dropdown. The dropdown can still override (e.g. for penalties).
    let winner: Match['winner'] = match.winner;
    if (scoreA !== null && scoreB !== null) {
      if (scoreA > scoreB) winner = match.teamA;
      else if (scoreB > scoreA) winner = match.teamB;
      else winner = 'draw';
    } else {
      winner = null;
    }
    onChange({ ...match, scoreA, scoreB, winner });
  };

  const updateTeam = (side: 'A' | 'B', teamId: string) => {
    const next: Match = {
      ...match,
      teamA: side === 'A' ? teamId : match.teamA,
      teamB: side === 'B' ? teamId : match.teamB,
    };
    onChange(next);
  };

  const updateWinner = (val: string) => {
    const winner =
      val === '' ? null : (val as Match['winner']);
    onChange({ ...match, winner });
  };

  return (
    <div className="match-row">
      <div className="match-side">
        {selectableTeams ? (
          <select
            value={match.teamA}
            onChange={(e) => updateTeam('A', e.target.value)}
            aria-label="Team A"
          >
            <option value="">{match.placeholderA ?? 'Pick team'}</option>
            {selectableTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag_emoji} {t.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="match-team">
            {teamA ? `${teamA.flag_emoji} ${teamA.name}` : match.placeholderA}
          </span>
        )}
        <ParticipantBadge participant={ownerA} />
      </div>

      <div className="match-score">
        <input
          type="number"
          min={0}
          value={match.scoreA ?? ''}
          onChange={(e) => updateScore('A', e.target.value)}
          aria-label="Score A"
        />
        <span className="match-dash">vs</span>
        <input
          type="number"
          min={0}
          value={match.scoreB ?? ''}
          onChange={(e) => updateScore('B', e.target.value)}
          aria-label="Score B"
        />
      </div>

      <div className="match-side match-side-right">
        <ParticipantBadge participant={ownerB} />
        {selectableTeams ? (
          <select
            value={match.teamB}
            onChange={(e) => updateTeam('B', e.target.value)}
            aria-label="Team B"
          >
            <option value="">{match.placeholderB ?? 'Pick team'}</option>
            {selectableTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag_emoji} {t.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="match-team">
            {teamB ? `${teamB.flag_emoji} ${teamB.name}` : match.placeholderB}
          </span>
        )}
      </div>

      <div className="match-winner">
        <label>
          Winner
          <select
            value={match.winner ?? ''}
            onChange={(e) => updateWinner(e.target.value)}
          >
            <option value="">unplayed</option>
            {match.teamA && (
              <option value={match.teamA}>
                {teamA?.name ?? match.teamA}
              </option>
            )}
            {match.teamB && (
              <option value={match.teamB}>
                {teamB?.name ?? match.teamB}
              </option>
            )}
            <option value="draw">draw</option>
          </select>
        </label>
      </div>
    </div>
  );
}
