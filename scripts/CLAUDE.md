# CLAUDE.md

Context for Claude (Claude Code, the @claude GitHub Action, or any future
session) working on this repo. Read this before making changes.

## What this is

A static, public, read-only website that tracks an 8-player Fantasy
World Cup 2026 league. Live URL:

  https://pllewellyn-sfdc.github.io/fantasy-wc-draft/

The page is purely a viewer. Score updates do not happen in the
browser. The single source of truth is `src/data/data.json`, which is
rewritten by a scheduled GitHub Action that polls ESPN every 15
minutes.

The owner is a non-developer; everything must be operable from the
GitHub web UI or Claude Code without local Node tooling.

## Architecture

```
data.json  --(read on every page load)-->  React app  -->  GitHub Pages
   ^
   | (scheduled rewrites every 15 min via GitHub Actions cron)
   |
ESPN scoreboard API  <--  scripts/update-scores.cjs
```

- React + Vite + TypeScript. Vite's `base` is `/<repo-name>/`,
  injected from a `VITE_BASE` env var the deploy workflow sets.
- The build is `vite build` only — no `tsc -b` (it broke on
  module resolution; types are not enforced in CI).
- Deploy workflow: `.github/workflows/deploy.yml`. Runs on push,
  on a 15-minute cron, and on `workflow_dispatch`. Same workflow
  handles both score refresh (schedule/dispatch only) and the
  static-site build/deploy.
- ESPN endpoint:
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD`.
  No auth, no API key. The updater iterates day-by-day across the
  tournament window because the date-range parameter has been
  unreliable in practice.

## League rules (the scoring system)

- Group stage per match: Win 3, Draw 1, Loss 0.
- Advancement bonuses (additive as a team progresses):
  - Reach R32: +3
  - Reach QF: +4
  - Reach SF: +5
  - Reach Final: +6
  - Champion: +8
- Third-place playoff winner: +3
- R16 has NO bonus of its own. A team that exits in R16 keeps only
  the +3 R32 bonus.
- Tiebreakers, in order: total points → goals scored → goal
  difference → wins.

Live scoring rules in the data: `src/data/data.json` →
`scoringRules`. The `ScoringRules` type is in `src/types.ts`.

## Participants and draft

8 players, 6 teams each. The player chips on the page show the
3-letter `shortName`, not initials, because some first names share
letters. Current shortNames:

| Name    | shortName | draft order in data.json |
| ------- | --------- | ------------------------ |
| Kenny   | KEN       | ESP MEX JPN IRN PAR CUW |
| Pete    | PET       | ENG NOR SUI CZE COD HAI |
| Talty   | TAL       | FRA CRO ECU ALG AUS IRQ |
| Clem    | CLM       | NED USA KOR SCO PAN QAT |
| Hidalgo | HID       | GER MAR EGY CAN KSA JOR |
| Scott   | SCO       | ARG URU TUR GHA TUN CPV |
| Clitz   | CLZ       | BRA BEL SEN AUT BIH UZB |
| Pat     | PAT       | POR COL SWE CIV RSA NZL |

## Source layout

```
src/
  App.tsx                  root component, computes leaderboard, lookups
  main.tsx                 ReactDOM.createRoot mount
  types.ts                 Team / Participant / Match / ScoringRules / AppData / ParticipantScore
  scoring.ts               pure: pointsForTeamInGroupMatch, bonusPointsForTeam,
                           computeLeaderboard, computeGroupStandings
  styles.css               plain CSS, no framework, mobile media query at the bottom
  data/data.json           SOURCE OF TRUTH — teams, participants, matches, scoringRules, lastUpdated
  components/
    GroupsView.tsx         single landing view: Today + Leaderboard + 12 group cards
    ParticipantBadge.tsx   colored chip with shortName
    (DraftPanel, KnockoutBracket, MatchEditor, GroupStage, Leaderboard
     are leftover from the editable version. They are no longer
     imported by App.tsx and can be deleted.)
scripts/
  update-scores.cjs        ESPN poller, run from the cron job
  build-seed.cjs           one-off generator that produced the initial data.json
  test-scoring.ts          smoke test for the scoring engine (uses tsx)
.github/workflows/deploy.yml   only workflow; do not add others
public/og.png              1200x630 OG share thumbnail
index.html                 Vite entry; do not try to open standalone
DEPLOY.md                  end-user GitHub Pages walkthrough
README.md                  developer walkthrough
```

## Known issues / TODOs

- **Scores are not flowing in.** As of last check, the cron has run
  many times but `github-actions[bot]` has zero commits, meaning
  the updater never finds matches it can update. Likely causes:
  ESPN's date-range parameter behavior, team abbreviation
  mismatches, or competitions[].date format. The updater was
  recently rewritten to iterate per-day with verbose logging; next
  step is to read the workflow logs of a fresh `workflow_dispatch`
  run and patch from what they show.
- The "Today" spotlight depends on `state` being populated. Until
  the updater commits real data, the section will be empty.
- `tsconfig.json` includes `scripts/` but `tsc` isn't run in CI;
  if you turn type-checking back on, scripts will need to be
  excluded.
- The unused components in `src/components/` (DraftPanel,
  KnockoutBracket, MatchEditor, Leaderboard, GroupStage) can be
  deleted for clarity.

## Conventions

- The owner does not use a terminal. When you make code changes,
  commit and push them yourself; do not leave instructions like
  "now run `npm install` and `vite build`."
- The owner asked never to use em dashes in any output. Use
  periods, commas, colons, or parentheses instead. This applies to
  comments, docs, and chat.
- The owner is in Pacific time but views the page on mobile in
  multiple time zones. Render kickoffs in the user's local time
  via `Date.toLocaleString` with no fixed timezone.
- Keep the UI read-only. No score-editing controls in the browser.
- Mobile is the primary form factor. Test layout below 700px wide.

## Deploy / verify cycle

1. Make changes locally (or in github.dev), commit, push to `main`.
2. The `deploy.yml` workflow runs (~90s). Watch the Actions tab.
3. The site at the URL above updates.
4. To force a fresh score pull without waiting 15 minutes, click
   Actions → "Update scores and deploy" → "Run workflow". This
   triggers the schedule-only score-refresh step.

## When debugging scores

- Open the Actions tab, find the most recent run that came from
  `event: schedule` or `workflow_dispatch`, click into the build
  job, expand the "Refresh scores from ESPN" step. The script logs
  every day's event count and any unrecognized team abbreviations.
- The script never crashes; it always exits 0. So a green
  workflow run does NOT mean scores were updated.
- A real score update produces a `github-actions[bot]` commit
  named "Auto-update scores from ESPN". The presence of that
  commit is the only reliable signal that the cron is doing its
  job.