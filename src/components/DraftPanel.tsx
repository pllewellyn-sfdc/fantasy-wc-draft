import { useMemo, useState } from 'react';
import type { Participant, Team } from '../types';
import { ParticipantBadge } from './ParticipantBadge';

interface Props {
  teams: Team[];
  participants: Participant[];
  onParticipantsChange: (next: Participant[]) => void;
}

// Snake-draft helper: given N participants, return the participant
// index whose pick is `pickNumber` (0-based).
//   round 0:  0,1,2,3
//   round 1:  3,2,1,0
//   round 2:  0,1,2,3
//   ...
function snakePicker(pickNumber: number, n: number): number {
  const round = Math.floor(pickNumber / n);
  const offset = pickNumber % n;
  return round % 2 === 0 ? offset : n - 1 - offset;
}

// Manage participants and draft picks. Two modes:
//   - Manual:   click a team, choose owner from a dropdown.
//   - Snake:    pick next team and the app assigns it to the
//               participant whose turn it is (computed from the
//               current draft progress).
//
// All edits go through `onParticipantsChange` so the source of truth
// stays in App. We do not keep a copy of the participants list in
// local state.
export function DraftPanel({
  teams,
  participants,
  onParticipantsChange,
}: Props) {
  const [mode, setMode] = useState<'manual' | 'snake'>('manual');

  // Index: teamId -> participantId. Recomputed when participants
  // change. This is what makes "is this team taken?" instant.
  const ownerByTeamId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participants) {
      for (const tid of p.draftedTeamIds) m.set(tid, p.id);
    }
    return m;
  }, [participants]);

  const totalPicks = participants.reduce(
    (s, p) => s + p.draftedTeamIds.length,
    0,
  );
  const nextSnakeIndex = snakePicker(totalPicks, participants.length);
  const onTheClock = participants[nextSnakeIndex];

  const assign = (teamId: string, participantId: string | null) => {
    const next = participants.map((p) => ({
      ...p,
      // Drop this team from anybody who currently has it...
      draftedTeamIds: p.draftedTeamIds.filter((id) => id !== teamId),
    }));
    if (participantId) {
      const target = next.find((p) => p.id === participantId);
      target?.draftedTeamIds.push(teamId);
    }
    onParticipantsChange(next);
  };

  const addParticipant = () => {
    const colors = ['#e63946', '#1d3557', '#2a9d8f', '#f4a261', '#9b5de5', '#00b4d8'];
    const used = new Set(participants.map((p) => p.color));
    const color = colors.find((c) => !used.has(c)) ?? '#666';
    const id = 'p' + (participants.length + 1) + '-' + Date.now();
    onParticipantsChange([
      ...participants,
      { id, name: 'Player ' + (participants.length + 1), color, draftedTeamIds: [] },
    ]);
  };

  const removeParticipant = (id: string) => {
    onParticipantsChange(participants.filter((p) => p.id !== id));
  };

  const renameParticipant = (id: string, name: string) => {
    onParticipantsChange(
      participants.map((p) => (p.id === id ? { ...p, name } : p)),
    );
  };

  const recolorParticipant = (id: string, color: string) => {
    onParticipantsChange(
      participants.map((p) => (p.id === id ? { ...p, color } : p)),
    );
  };

  return (
    <div className="draft-panel">
      <section className="card">
        <div className="row-between">
          <h3>Participants</h3>
          <button onClick={addParticipant}>+ add player</button>
        </div>
        <div className="participant-list">
          {participants.map((p) => (
            <div key={p.id} className="participant-row">
              <input
                type="color"
                value={p.color}
                onChange={(e) => recolorParticipant(p.id, e.target.value)}
                aria-label="Color"
              />
              <input
                type="text"
                value={p.name}
                onChange={(e) => renameParticipant(p.id, e.target.value)}
                aria-label="Name"
              />
              <span className="muted">
                {p.draftedTeamIds.length} team
                {p.draftedTeamIds.length === 1 ? '' : 's'}
              </span>
              <button
                className="ghost"
                onClick={() => removeParticipant(p.id)}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h3>Draft</h3>
          <div className="mode-switch">
            <label>
              <input
                type="radio"
                name="draft-mode"
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
              />{' '}
              Manual
            </label>
            <label>
              <input
                type="radio"
                name="draft-mode"
                checked={mode === 'snake'}
                onChange={() => setMode('snake')}
              />{' '}
              Snake
            </label>
          </div>
        </div>

        {mode === 'snake' && onTheClock && (
          <p className="muted">
            On the clock:{' '}
            <ParticipantBadge participant={onTheClock} size="md" /> (pick #
            {totalPicks + 1})
          </p>
        )}

        <div className="team-grid">
          {teams.map((t) => {
            const ownerId = ownerByTeamId.get(t.id);
            const owner = participants.find((p) => p.id === ownerId);
            return (
              <div
                key={t.id}
                className={'team-cell ' + (owner ? 'taken' : 'open')}
                style={
                  owner
                    ? {
                        borderColor: owner.color,
                        boxShadow: 'inset 4px 0 0 ' + owner.color,
                      }
                    : undefined
                }
              >
                <div className="team-cell-name">
                  {t.flag_emoji} {t.name}
                  <span className="muted"> · {t.group}</span>
                </div>
                <div className="team-cell-action">
                  {mode === 'manual' ? (
                    <select
                      value={ownerId ?? ''}
                      onChange={(e) =>
                        assign(t.id, e.target.value || null)
                      }
                    >
                      <option value="">unclaimed</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : owner ? (
                    <span>
                      <ParticipantBadge participant={owner} />
                      <button
                        className="ghost"
                        onClick={() => assign(t.id, null)}
                      >
                        undo
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        onTheClock && assign(t.id, onTheClock.id)
                      }
                      disabled={!onTheClock}
                    >
                      draft for {onTheClock?.name ?? '...'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
