import { useMemo, useState } from 'react';
import seed from './data/data.json';
import type { AppData, Participant } from './types';
import { computeLeaderboard } from './scoring';
import { GroupsView } from './components/GroupsView';

// The page is purely read-only. Source of truth is the bundled
// `data/data.json`, which the GitHub Actions cron job rewrites every
// 15 minutes from the live ESPN scoreboard. We deliberately do NOT
// read from localStorage so visitors always see whatever was most
// recently committed and deployed.
export function App() {
  const [data] = useState<AppData>(seed as AppData);

  // Pre-compute lookup maps once so children don't rescan arrays.
  const lookups = useMemo(() => {
    const teamById = new Map(data.teams.map((t) => [t.id, t]));
    const ownerByTeamId = new Map<string, Participant>();
    for (const p of data.participants) {
      for (const tid of p.draftedTeamIds) ownerByTeamId.set(tid, p);
    }
    return { teamById, ownerByTeamId };
  }, [data]);

  // Leaderboard derives from current matches; it recomputes on every
  // deploy because the seed JSON has changed.
  const scores = useMemo(
    () =>
      computeLeaderboard(data.participants, data.matches, data.scoringRules),
    [data],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Fantasy World Cup Draft</h1>
        <span className="muted app-subtitle">
          Scores auto-update from ESPN every 15 minutes.
        </span>
      </header>
      <main className="app-main">
        <GroupsView
          teams={data.teams}
          participants={data.participants}
          matches={data.matches}
          scores={scores}
          lookups={lookups}
        />
      </main>
    </div>
  );
}

export default App;
