import type { Participant } from '../types';

// Tiny presentational component used everywhere a participant is
// displayed next to a team. Keeping it isolated means the color +
// short-code treatment stays consistent across the app.
//
// Identification logic: prefer the explicit `shortName` if one is
// configured. This is how we disambiguate participants whose first
// names share a letter (Clem vs Clitz, Pete vs Pat). Without
// shortName we fall back to up to two-letter initials.
interface Props {
  participant?: Participant;
  size?: 'sm' | 'md';
}

function shortCodeFor(p: Participant): string {
  if (p.shortName && p.shortName.length > 0) {
    return p.shortName.toUpperCase();
  }
  return p.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ParticipantBadge({ participant, size = 'sm' }: Props) {
  if (!participant) {
    return (
      <span className="badge badge-empty" title="Not yet drafted">
        unclaimed
      </span>
    );
  }
  const code = shortCodeFor(participant);

  return (
    <span
      className={`badge badge-${size}`}
      style={{
        backgroundColor: participant.color,
        color: '#fff',
      }}
      title={participant.name}
    >
      <span className="badge-initials">{code}</span>
      <span className="badge-name">{participant.name}</span>
    </span>
  );
}
