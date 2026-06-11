import { useEffect, useMemo, useState } from 'react';
import seed from './data/data.json';
import type {
  AppData,
  Match,
  Participant,
  ScoringRules,
} from './types';
import { computeLeaderboard } from './scoring';
import { GroupStage } from './components/GroupStage';
import { KnockoutBracket } from './components/KnockoutBracket';
import { DraftPanel } from './components/DraftPanel';
import { Leaderboard } from './components/Leaderboard';

// Local-storage key for persisted state. Kept versioned so a future
// schema change can bump it and ignore old payloads cleanly.
const LS_KEY = 'fantasy-wc-draft:v1';

type Tab = 'leaderboard' | 'groups' | 'knockout' | 'draft';

// State management decisions, summarised:
//
//   - The full app state is one AppData object. There is no Redux,
//     no context, no per-component fetches. Every component receives
//     the slice it needs by prop.
//   - Edits flow up through callbacks. Components never mutate; they
//     hand back a new Match/Participant/etc. and App swaps it in.
//     This makes the leaderboard's useMemo dependency tracking
//     trivial: any state change produces a new array reference and
//     the leaderboard recomputes.
//   - Persistence is a one-line useEffect that mirrors state to
//     localStorage. Because everything serialises to JSON, the same
//     payload is exportable as a file or pasteable into a URL hash
//     for sharing a frozen tournament.
//   - The first read tries localStorage, then falls back to the seed
//     data.json. This means the deployed static URL boots with the
//     example draft, but each visitor's edits stay local.
function loadInitialState(): AppData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      // Light validation: fall back to seed if shape looks wrong.
      if (
        Array.isArray(parsed.teams) &&
        Array.isArray(parsed.participants) &&
        Array.isArray(parsed.matches) &&
        parsed.scoringRules
      ) {
        return parsed;
      }
    }
  } catch {
    /* ignore and use seed */
  }
  return seed as AppData;
}

export function App() {
  const [data, setData] = useState<AppData>(loadInitialState);
  const [tab, setTab] = useState<Tab>('leaderboard');

  // Persist on every change. JSON.stringify is cheap on this scale
  // (~80 matches, 32 teams) so we don't bother debouncing.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [data]);

  // Pre-compute lookup maps once per data change. Components use
  // these instead of repeatedly scanning the teams/participants
  // arrays.
  const lookups = useMemo(() => {
    const teamById = new Map(data.teams.map((t) => [t.id, t]));
    const ownerByTeamId = new Map<string, Participant>();
    for (const p of data.participants) {
      for (const tid of p.draftedTeamIds) ownerByTeamId.set(tid, p);
    }
    return { teamById, ownerByTeamId };
  }, [data.teams, data.participants]);

  // Leaderboard is fully derived. Recomputed on every data change.
  // 32 teams x 80 matches is small enough that we don't bother
  // memoising more aggressively.
  const scores = useMemo(
    () =>
      computeLeaderboard(data.participants, data.matches, data.scoringRules),
    [data.participants, data.matches, data.scoringRules],
  );

  // ---- Update helpers passed to children ----------------------------------

  const handleMatchChange = (next: Match) => {
    setData((prev) => ({
      ...prev,
      matches: prev.matches.map((m) => (m.id === next.id ? next : m)),
    }));
  };

  const handleParticipantsChange = (next: Participant[]) => {
    setData((prev) => ({ ...prev, participants: next }));
  };

  const handleScoringRulesChange = (rules: ScoringRules) => {
    setData((prev) => ({ ...prev, scoringRules: rules }));
  };

  // ---- Import / export / reset --------------------------------------------

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fantasy-wc-draft.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as AppData;
      setData(parsed);
    } catch (err) {
      alert('Could not parse JSON: ' + String(err));
    }
  };

  const resetToSeed = () => {
    if (confirm('Reset all scores and draft picks to the seed data?')) {
      setData(seed as AppData);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Fantasy World Cup Draft</h1>
        <nav className="tabs">
          {(
            [
              ['leaderboard', 'Leaderboard'],
              ['groups', 'Groups'],
              ['knockout', 'Knockouts'],
              ['draft', 'Draft'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              className={tab === k ? 'tab tab-active' : 'tab'}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="toolbar">
          <button onClick={exportJson}>Export</button>
          <label className="file-button">
            Import
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = '';
              }}
            />
          </label>
          <button className="ghost" onClick={resetToSeed}>
            Reset
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'leaderboard' && (
          <Leaderboard
            scores={scores}
            participants={data.participants}
            teamById={lookups.teamById}
            scoringRules={data.scoringRules}
            onScoringRulesChange={handleScoringRulesChange}
          />
        )}

        {tab === 'groups' && (
          <GroupStage
            teams={data.teams}
            matches={data.matches}
            lookups={lookups}
            onMatchChange={handleMatchChange}
          />
        )}

        {tab === 'knockout' && (
          <KnockoutBracket
            teams={data.teams}
            matches={data.matches}
            lookups={lookups}
            onMatchChange={handleMatchChange}
          />
        )}

        {tab === 'draft' && (
          <DraftPanel
            teams={data.teams}
            participants={data.participants}
            onParticipantsChange={handleParticipantsChange}
          />
        )}
      </main>

      <footer className="app-footer">
        <span className="muted">
          Edits persist in your browser. Use Export to share a snapshot.
        </span>
      </footer>
    </div>
  );
}

export default App;
