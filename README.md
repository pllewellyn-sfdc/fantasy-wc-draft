# Fantasy World Cup Draft

A static React + TypeScript web app for running a fantasy World Cup
draft. No backend, no login. The full state (teams, participants,
draft picks, match results, scoring rules) is one JSON object that
loads from `src/data/data.json` on first visit and is then mirrored
to the browser's `localStorage` on every edit.

## What's in the box

```
fantasy-wc-draft/
  index.html                 // Vite entry
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx                 // mounts <App />
    App.tsx                  // owns all state, routes between tabs
    styles.css               // plain CSS, no framework
    types.ts                 // Team / Participant / Match / ScoringRules
    scoring.ts               // pure scoring engine + group-table helper
    data/data.json           // 48 teams (12 groups), 8 participants, 104 matches
                                 // generated from scripts/build-seed.cjs
    components/
      ParticipantBadge.tsx   // chip that shows owner colour + initials
      MatchEditor.tsx        // inline score / winner editor
      GroupStage.tsx         // 8 group cards with live standings
      KnockoutBracket.tsx    // R16 -> Final
      DraftPanel.tsx         // manual + snake draft modes
      Leaderboard.tsx        // ranking + per-team drill-down + rules editor
  scripts/
    test-scoring.ts          // smoke test for the scoring engine
    build-seed.cjs           // regenerates src/data/data.json from inline tables
```

## Run locally

```
npm install
npm run dev
```

Then open the URL Vite prints (typically http://localhost:5173).

## Type-check and run the scoring smoke test

```
npm run typecheck
npm run test:scoring
```

## Deploy as a static site

```
npm run build
```

Vite produces a fully static bundle in `dist/`. Drag that folder into
Netlify, Vercel, Cloudflare Pages, or any static host. Each visitor's
edits live in their own browser via `localStorage`. To share a frozen
view of the tournament, use the **Export** button in the header to
download a JSON snapshot, then send that file to a friend; they can
load it with **Import**.

## Data model

```
Team           { id, name, group, flag_emoji }
Participant    { id, name, color, draftedTeamIds: string[] }
Match          { id, round, teamA, teamB, scoreA, scoreB, winner,
                 placeholderA?, placeholderB? }
ScoringRules   { win, draw, loss, cleanSheet, goalBonus }
```

`round` is one of `group | r32 | r16 | qf | sf | third | final` to
match the 2026 FIFA World Cup format (48 teams, 12 groups of 4, R32
through to the final). Knockout matches start with empty `teamA` /
`teamB`; the picker in `MatchEditor` lets you fill them once group
standings are settled.

## Scoring

`scoring.ts` exports a pure `computeLeaderboard(participants, matches,
rules)` function. For every drafted team, every played match
contributes:

- `win` / `draw` / `loss` points (the bucket, configurable)
- `cleanSheet` points if the opposing team scored 0
- `goalBonus * goalsScored`

Tie-break is goals scored, then alphabetical name. Change any value
on the **Leaderboard** tab to see totals recompute live.

## State management notes

The full app state is a single `AppData` object held in `App.tsx`.
There is no Redux or context. Components receive the slice they need
by prop and emit edits back through callbacks; `App` swaps in a new
object on every change so the leaderboard's `useMemo` refires
naturally.

`localStorage` is written on every state change inside a single
`useEffect`. The first read tries `localStorage`, then falls back to
the seed `data.json`. That means the deployed URL boots with the
example draft, but each visitor's edits stay private.
