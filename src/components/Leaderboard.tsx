import { Fragment, useState } from 'react';
import type {
  Participant,
  ParticipantScore,
  ScoringRules,
  Team,
} from '../types';
import { ParticipantBadge } from './ParticipantBadge';

interface Props {
  scores: ParticipantScore[];
  participants: Participant[];
  teamById: Map<string, Team>;
  scoringRules: ScoringRules;
  onScoringRulesChange: (next: ScoringRules) => void;
}

// The leaderboard is fully derived from props.scores (computed by the
// scoring engine in App with useMemo). This component owns only UI
// state: which participant is currently expanded for the per-team
// drill-down.
export function Leaderboard({
  scores,
  participants,
  teamById,
  scoringRules,
  onScoringRulesChange,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const byId = new Map(participants.map((p) => [p.id, p]));

  return (
    <div className="leaderboard-wrapper">
      <section className="card">
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
              <th aria-label="expand"></th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => {
              const p = byId.get(s.participantId);
              const isOpen = expanded === s.participantId;
              return (
                <Fragment key={s.participantId}>
                  <tr>
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
                    <td>
                      <button
                        className="ghost"
                        onClick={() =>
                          setExpanded(isOpen ? null : s.participantId)
                        }
                      >
                        {isOpen ? 'hide' : 'teams'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={9}>
                        <table className="per-team">
                          <thead>
                            <tr>
                              <th>Team</th>
                              <th>P</th>
                              <th>W</th>
                              <th>D</th>
                              <th>L</th>
                              <th>CS</th>
                              <th>GF</th>
                              <th>Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.perTeam
                              .slice()
                              .sort((a, b) => b.points - a.points)
                              .map((t) => {
                                const team = teamById.get(t.teamId);
                                return (
                                  <tr key={t.teamId}>
                                    <td>
                                      {team?.flag_emoji} {team?.name}
                                    </td>
                                    <td>{t.matchesPlayed}</td>
                                    <td>{t.wins}</td>
                                    <td>{t.draws}</td>
                                    <td>{t.losses}</td>
                                    <td>{t.cleanSheets}</td>
                                    <td>{t.goalsFor}</td>
                                    <td>{t.points}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Scoring rules</h3>
        <p className="muted">
          Change any value to recompute the leaderboard live. Negative
          values are allowed for losses if you want to penalise them.
        </p>
        <div className="rules-grid">
          {(
            [
              ['win', 'Win'],
              ['draw', 'Draw'],
              ['loss', 'Loss'],
              ['cleanSheet', 'Clean sheet'],
              ['goalBonus', 'Per goal scored'],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                value={scoringRules[key]}
                onChange={(e) =>
                  onScoringRulesChange({
                    ...scoringRules,
                    [key]: Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
