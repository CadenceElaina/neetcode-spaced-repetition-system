# Task Queue — Aurora

Agents and sessions pull from this file. Claim a task by adding your session ID to the Agent column.
**Canonical task file** — root `TASKS.md` is a mirror. Edit only this one.

Last updated: 2026-05-03 — merged root + docs queues after multi-agent audit

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

### Bugs

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-001 | 🔴 P0    | **Mock interview: fix 1-problem bug** — `pickMockProblems` requires both a Medium AND a Hard; when hard pool is scarce it silently returns 1. Fix to always show 2, using Medium+Medium fallback if no Hards available. | `dashboard-client.tsx` ~line 291 | Mock tab consistently shows 2 problems; handles empty hard/medium pool gracefully |
| T-002 | 🔴 P0    | **`PARTIAL:NONE` multiplier is 1.0 — should be 1.1.** README and docs both state all PARTIAL outcomes → 1.1× regardless of quality. Currently `"PARTIAL:NONE": 1.0` while all other PARTIAL keys → 1.1. Understates stability gain on partial solves with no quality selected. | `src/lib/srs.ts`, `tests/unit/srs.test.ts` | Change to 1.1. Add unit test asserting all four PARTIAL combos produce identical stability output. All 52 existing tests pass. |
| T-003 | 🟠 P1    | **`NO:OPTIMAL` / `NO:SUBOPTIMAL` have no entry in `BASE_MULTIPLIERS`** — silently fall through to `?? 1.0`. Either verify the attempt form makes these unreachable and add a comment, or add explicit entries (`0.8`) matching `NO:BRUTE_FORCE`. | `src/lib/srs.ts`, `log-attempt-modal.tsx` | Unreachable combinations are documented; reachable ones have explicit multipliers. Add unit test for the chosen behavior. |

### UX / UI

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-004 | 🟠 P1    | **Theme: remove casual elements** — remove or hide `CatGreeting` from landing page, remove "powered by cats" from footer, audit `--accent-secondary` (pink) usage to gradient/hover only | `landing-client.tsx`, `layout.tsx`, `nav.tsx`, `globals.css` | No cat ASCII, no ":3", no "powered by cats" visible on default/unauthenticated views; pink not used for primary UI elements |
| T-005 | 🟠 P1    | **Cold start: fix new user default state** — when `reviewQueue.length === 0`, default `listMode` to `"new"`; suppress urgency/BEHIND indicators when `attemptedCount < 5` | `dashboard-client.tsx` ~line 485 | Fresh account lands on New tab; no scary red indicators before any data exists |
| T-006 | 🟡 P2    | **Setup Guide button shows for all authenticated users** — it's a self-hosting wizard most users don't need. Move it into the user menu dropdown (below GitHub Sync) or gate it. | `nav.tsx`, `setup-guide.tsx` | Setup Guide no longer occupies a primary nav slot for authenticated users. Still reachable via user menu. Landing page self-host entry still works. |
| T-007 | 🟡 P2    | **Topbar copy audit: recommendation banner** — review all branches of `computePracticeRecommendation`; the tone badge says "WATCH" (internal label) which is jargon to users. Replace tone badge text with user-facing copy. Verify title/body/reason strings are accurate and consistent in tone. | `dashboard-client.tsx` ~lines 370–471 | Badge reads something like "Review First" / "On Track" instead of "WATCH"/"neutral". All 7 copy branches reviewed and updated where misleading. |
| T-008 | 🟡 P2    | **Readiness widget at low data volume** — when `attemptedCount < 5`, the readiness score/tier display is misleading. Clearly label it as "limited data". Add raw fraction to Consistency row (e.g. "3 of 17 due reviews, 14-day window"). | `dashboard-client.tsx` (readiness section) | Widget shows "limited data" indicator with < 5 attempts. Consistency row shows raw counts alongside %. |
| T-009 | 🟡 P2    | **"Done" tab label is ambiguous** — "Done 33" reads as "Done today" at first glance but means all completed problems. Rename tab to "Completed". | `dashboard-client.tsx` | Third tab reads "Completed N" consistently. |
| T-010 | 🟡 P2    | **Log attempt modal: pre-fill audit** — verify that clicking Log from Review, New, and Completed tabs all correctly pre-fill problem context (title, LeetCode #, difficulty, category). | `log-attempt-modal.tsx`, `dashboard-client.tsx` | All three entry points pre-fill correctly; no undefined fields in any tab's Log flow. |

### Algorithm

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-011 | 🟠 P1    | **Algorithm audit** — trace a solved+optimal+confidence-5 attempt through `computeNewStability` manually; verify the stability multiplier product matches the README table; write the result in a comment. Document any discrepancy found. | `src/lib/srs.ts`, `tests/unit/srs.test.ts`, `README.md` | Verified trace documented in a code comment. Any discrepancy between code, README, and ARCHITECTURE.md fixed and consistent. |

### Feature Verification

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-012 | 🟠 P1    | **Verify Import flow end-to-end** — paste real neetcode.io activity text → problems parse correctly → quick-confirm logs an attempt → SRS state updates. Document any parsing edge cases. | `src/app/import/import-client.tsx` | Import parses a pasted activity block correctly. Confirmed problems appear in queue. Quick-confirm records an attempt with sensible defaults. |
| T-013 | 🟡 P2    | **Problem detail page: verify learning flow** — confirm video link is prominent, optimal complexity is shown as a post-attempt reference (not spoiler before), and the post-log confirmation shows user complexity vs optimal. | `src/app/problems/[id]/page.tsx`, `attempt-form.tsx` | Video link visible. Optimal complexity shown after logging. Post-log view shows complexity comparison. |

### Tests / Docs

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-014 | 🟢 P3    | **API tests: attempt logging** — add Vitest tests for `POST /api/attempts` covering: successful attempt → SRS state updated, invalid outcome → 400, unauthenticated → 401 | `tests/api/attempts.test.ts` (new), `src/app/api/attempts/route.ts` | 3+ passing tests covering happy path and two error paths. |
| T-015 | 🟢 P3    | **OG / social preview metadata** — add `og:image`, `twitter:card`, title and description tags to layout. | `src/app/layout.tsx`, `public/og.png` | Pasting aurora-ascent.vercel.app into Slack/Twitter shows preview with title, description, image. |
| T-016 | 🟢 P3    | **Performance: user avatar `<img>` → `<Image>`** — nav uses raw `<img>` for GitHub avatar (Next.js lint warning). Replace with `next/image`. | `src/components/nav.tsx` | No `@next/next/no-img-element` ESLint warning on avatar element. |
| T-017 | 🟢 P3    | **Docs: sync CURRENT.md and CLAUDE.md** — update CURRENT.md to reflect tasks completed this session; update CLAUDE.md to point to `docs/TASKS.md` as the canonical queue (not root TASKS.md). | `docs/CURRENT.md`, `CLAUDE.md` | CURRENT.md "Recently Completed" list is accurate. CLAUDE.md points to docs/TASKS.md. |

---

## In Progress

| ID | Agent | Description |
|----|-------|-------------|
| T-001 | Claude (session 2026-05-03) | Mock interview: fix 1-problem bug |

---

## Done

| ID    | Completed  | Description |
|-------|------------|-------------|
| —     | 2026-04-22 | `fix(readiness)`: sample weight scales score with data volume |
| —     | 2026-04-22 | `fix(readiness)`: show tier from day one, D is honest starting grade |
| —     | 2026-04-22 | `feat(hosting)`: user cap, Supabase keep-alive cron, waitlist page |
| —     | 2026-04-22 | `feat(nav)`: improve profile menu with identity header, GitHub sync status |
| —     | 2026-04-22 | `feat(onboarding)`: persist tour completion in DB, fix stability message |
| —     | 2026-04-22 | `fix(dashboard)`: calm strategy recommendation UI |
