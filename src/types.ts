// Domain types for the Fantasy World Cup Draft tracker.
// Kept deliberately small so the JSON seed file is hand-editable
// and the scoring engine can stay a pure function over these shapes.
 
// 2026 World Cup format: 12 groups (A-L), 48 teams, R32 knockout.
export type GroupLetter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
 
export type Round =
  | 'group'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'third'
  | 'final';
 
export interface Team {
  id: string;          // e.g. "BRA"
  name: string;        // e.g. "Brazil"
  group: GroupLetter;  // group-stage assignment
  flag_emoji: string;  // e.g. "🇧🇷"
}
 
export interface Participant {
  id: string;
  name: string;
  color: string;            // hex, used for badges and accents
  draftedTeamIds: string[]; // ordered list of team ids this participant owns
}
 
// A match. teamA / teamB are Team ids when known.
// For knockout matches that have not yet been seeded they may be empty
// strings; the UI shows the placeholder label instead.
// `winner` is a Team id, the literal "draw", or null when the match
// has not been played yet.
export interface Match {
  id: string;
  round: Round;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  winner: string | 'draw' | null;
  // ISO 8601 UTC timestamp for the scheduled kickoff. Optional so
  // existing data.json entries without it stay valid; the ESPN
  // updater fills it in on the first run that sees the match.
  kickoff?: string | null;
  // Broadcast network short-name, e.g. "FOX" or "Telemundo". US
  // English broadcast preferred; null if ESPN didn't list one.
  tvChannel?: string | null;
  // Optional human label used while a knockout slot is unfilled,
  // e.g. "Winner A" or "Runner-up B" or "W49".
  placeholderA?: string;
  placeholderB?: string;
}
 
export interface ScoringRules {
  win: number;         // points awarded per match win
  draw: number;        // points per draw
  loss: number;        // usually 0 or negative
  cleanSheet: number;  // points if the team kept a clean sheet
  goalBonus: number;   // points per goal scored
}
 
export interface AppData {
  teams: Team[];
  participants: Participant[];
  matches: Match[];
  scoringRules: ScoringRules;
}
 
// Per-participant scoring breakdown returned by the scoring engine.
export interface ParticipantScore {
  participantId: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  cleanSheets: number;
  goalsFor: number;
  // Per-team contributions for the leaderboard drill-down.
  perTeam: Array<{
    teamId: string;
    points: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    cleanSheets: number;
    goalsFor: number;
  }>;
}