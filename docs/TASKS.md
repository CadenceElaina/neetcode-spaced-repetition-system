# Task Queue — Aurora

Agents and sessions pull from this file. Claim a task by adding your session ID to the Agent column.

Last updated: 2026-05-03

---

## Priority Tiers

| Tier | Label | Description |
|---|---|---|
| P0 | 🔴 Critical | Bug that breaks a core flow or corrupts data |
| P1 | 🟠 High | Bug or UX issue visible to a first-time user or the professor |
| P2 | 🟡 Medium | Polish, copy quality, secondary UX |
| P3 | 🟢 Low | Nice-to-have, tests, docs |

---

## Open Tasks

| ID | Priority | Description | Scope Hints | Acceptance Criteria |
|---|---|---|---|---|
| T-001 | 🔴 P0 | **Mock interview: fix 1-problem bug** — `pickMockProblems` requires both a Medium AND a Hard; when hard pool is scarce it silently returns 1. Fix to always show 2, using Medium+Medium fallback if no Hards are available. | `src/app/dashboard/dashboard-client.tsx` line ~291 | Mock tab consistently shows 2 problems; handles empty hard/medium pool gracefully |
| T-002 | 🟠 P1 | **Theme: remove casual elements** — remove or hide `CatGreeting` from landing page, remove "powered by cats" from footer, audit `--accent-secondary` usage to gradient/hover only | `src/app/landing-client.tsx`, `src/app/layout.tsx`, `src/components/nav.tsx`, `src/app/globals.css` | No cat ASCII, no ":3", no "powered by cats" on default/unauthenticated views; pink not used for primary UI elements |
| T-003 | 🟠 P1 | **Cold start: fix new user default state** — when `reviewQueue.length === 0`, default `listMode` to `"new"` instead of `"review"`; suppress urgency/BEHIND indicators when `attemptedCount < 5` | `src/app/dashboard/dashboard-client.tsx` (listMode initial state, ~line 485) | Fresh account lands on New tab; no scary red indicators before any data exists |
| T-004 | 🟠 P1 | **Algorithm audit** — trace a solved+optimal+confidence-5 attempt through `computeNewStability` manually; verify the stability multiplier product matches the README table; write the result in a comment | `src/lib/srs.ts`, `tests/unit/srs.test.ts`, `README.md` | Verified trace documented; any discrepancy fixed and synced across srs.ts + ARCHITECTURE.md + README.md |
| T-005 | 🟡 P2 | **Topbar copy audit** — review all 7 branches of `computePracticeRecommendation`; verify `title`, `body`, and `reason` strings are accurate, useful, and consistent in tone | `src/app/dashboard/dashboard-client.tsx` lines 370–471 | Copy reviewed; any misleading or inconsistent strings updated |
| T-006 | 🟡 P2 | **Readiness widget: low-data accuracy** — verify behavior when `attemptedCount < 5`; ensure score/tier is clearly labeled as "limited data" rather than showing confident-looking percentages | `src/app/dashboard/dashboard-client.tsx` (readiness section) | With 1–4 attempts, readiness widget shows a "limited data" indicator; doesn't display misleading percentages |
| T-007 | 🟡 P2 | **Log attempt modal: pre-fill audit** — verify that clicking Log from Review, New, and Completed tabs all correctly pre-fill the problem context (title, LeetCode #, difficulty, category) | `src/components/log-attempt-modal.tsx`, `src/app/dashboard/dashboard-client.tsx` | All three entry points pre-fill correctly; no undefined fields |
| T-008 | 🟢 P3 | **API tests: attempt logging** — add Vitest tests for `POST /api/attempts` covering: successful attempt → SRS state updated, invalid outcome → 400, unauthenticated → 401 | `tests/api/attempts.test.ts` (new file), `src/app/api/attempts/route.ts` | 3+ passing tests covering happy path and two error paths |
| T-009 | 🟢 P3 | **Docs: update CLAUDE.md** — add a section pointing to docs/CURRENT.md and docs/ITERATION.md; update "What's In Progress / Planned" section to reflect current state | `CLAUDE.md`, `hidden-docs/LLM_CONTEXT.md` | Both docs reference the iteration process; planned section is accurate |

---

## In Progress

| ID | Agent | Description |
|---|---|---|
| — | — | — |

---

## Done

| ID | Completed | Description |
|---|---|---|
| — | — | — |
