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
  // 3-letter display code used in the colored chip on every match
  // row. Falls back to first letters of the name if absent. We use
  // explicit codes to avoid collisions like Clem/Clitz both showing
  // a "C" and Pete/Pat both showing a "P".
  shortName?: string;
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
  // ESPN status: "pre" (scheduled), "in" (in progress), "post"
  // (finished). Used by the Today/On-now spotlight to show the
  // live indicator.
  state?: 'pre' | 'in' | 'post' | null;
  // Optional human label used while a knockout slot is unfilled,
  // e.g. "Winner A" or "Runner-up B" or "W49".
  placeholderA?: string;
  placeholderB?: string;
}
 
// League scoring: group-stage W/D/L plus additive advancement
// bonuses for each knockout round a team reaches. R16 has no bonus
// of its own — the next milestone after R32 is the QF.
export interface ScoringRules {
  groupWin: number;       // group stage win
  groupDraw: number;      // group stage draw
  groupLoss: number;      // usually 0
  reachR32: number;       // team appears in any R32 fixture
  reachQF: number;        // team appears in any QF fixture
  reachSF: number;        // team appears in any SF fixture
  reachFinal: number;     // team appears in the final
  champion: number;       // winner of the final
  thirdPlaceWin: number;  // winner of the third-place playoff
}
 
export interface AppData {
  teams: Team[];
  participants: Participant[];
  matches: Match[];
  scoringRules: ScoringRules;
  // ISO 8601 UTC timestamp of the last time the ESPN updater
  // committed real changes. Optional so older data.json files stay
  // valid; the App falls back to "just now" when missing.
  lastUpdated?: string;
}
 
// Per-participant scoring breakdown returned by the scoring engine.
export interface ParticipantScore {
  participantId: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  bonusPoints: number; // total advancement + champion + 3rd-place
  // Per-team contributions for the leaderboard drill-down.
  perTeam: Array<{
    teamId: string;
    points: number;          // total fantasy points earned by this team
    groupPoints: number;     // group-stage W/D/L only
    bonusPoints: number;     // advancement + champion + 3rd-place
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  }>;
}