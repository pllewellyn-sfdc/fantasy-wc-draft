import type { Participant } from '../types';

// Tiny presentational component used everywhere a participant is
// displayed next to a team. Keeping it isolated means the color +
// avatar treatment stays consistent across the app.
interface Props {
  participant?: Participant;
  size?: 'sm' | 'md';
}

export function ParticipantBadge({ participant, size = 'sm' }: Props) {
  if (!participant) {
    return (
      <span className="badge badge-empty" title="Not yet drafted">
        unclaimed
      </span>
    );
  }
  const initials = participant.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <span
      className={`badge badge-${size}`}
      style={{
        backgroundColor: participant.color,
        color: '#fff',
      }}
      title={participant.name}
    >
      <span className="badge-initials">{initials}</span>
      <span className="badge-name">{participant.name}</span>
    </span>
  );
}
