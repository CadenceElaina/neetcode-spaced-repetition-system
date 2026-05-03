# Task Queue — Aurora

Agents and sessions pull from this file. Claim a task by adding your session ID to the Agent column.
**Canonical task file** — root `TASKS.md` is a mirror. Edit only this one.

Last updated: 2026-05-03 — T-011 algorithm audit comment, T-015 OG metadata added

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

### Algorithm

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|

### UX / Feature Verification

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-010 | 🟡 P2    | **Log attempt modal: pre-fill audit** — verify that clicking Log from Review, New, and Completed tabs all correctly pre-fill problem context (title, LeetCode #, difficulty, category). | `src/components/log-attempt-modal.tsx`, `dashboard-client.tsx` | All three entry points pre-fill correctly; no undefined fields in any tab's Log flow. |
| T-012 | 🟠 P1    | **Verify Import flow end-to-end** — paste real neetcode.io activity text → problems parse correctly → quick-confirm logs an attempt → SRS state updates. Document any parsing edge cases. | `src/app/import/import-client.tsx` | Import parses a pasted activity block correctly. Confirmed problems appear in queue. Quick-confirm records an attempt with sensible defaults. |
| T-013 | 🟡 P2    | **Problem detail page: verify learning flow** — confirm video link is prominent, optimal complexity is shown as a post-attempt reference (not spoiler before), and the post-log confirmation shows user complexity vs optimal. | `src/app/problems/[id]/page.tsx`, `attempt-form.tsx` | Video link visible. Optimal complexity shown after logging. Post-log view shows complexity comparison. |

### Tests / Docs

| ID    | Priority | Description | Scope Hints | Acceptance Criteria |
|-------|----------|-------------|-------------|---------------------|
| T-014 | 🟢 P3    | **API tests: attempt logging** — add Vitest tests for `POST /api/attempts` covering: successful attempt → SRS state updated, invalid outcome → 400, unauthenticated → 401 | `tests/api/attempts.test.ts` (new), `src/app/api/attempts/route.ts` | 3+ passing tests covering happy path and two error paths. |

---

## In Progress

| ID | Agent | Description |
|----|-------|-------------|
| —  | —     | —           |

---

## Done

| ID    | Completed  | Description |
|-------|------------|-------------|
| T-017 | 2026-05-03 | `docs`: CURRENT.md synced with session; CLAUDE.md updated to point to docs/TASKS.md |
| T-001 | 2026-05-03 | `fix(dashboard)`: `pickMockProblems` always returns 2; Medium+Medium fallback when no Hards; `pickTwo` deduplication via index-swap |
| T-002 | 2026-05-03 | `fix(srs)`: `PARTIAL:NONE` multiplier corrected 1.0→1.1; unit tests covering all four PARTIAL combos |
| T-008 | 2026-05-03 | `fix(dashboard)`: readiness "limited data" label; consistency raw fraction; Setup Guide to user menu (T-006 covered) |
| T-006 | 2026-05-03 | `fix(nav)`: Setup Guide moved to authenticated user menu dropdown; removed from primary nav slot |
| T-016 | 2026-05-03 | `fix(nav)`: avatar `<img>` → `next/image`; add avatars.githubusercontent.com to remotePatterns |
| T-009 | 2026-05-03 | `fix(dashboard)`: "Done" tab renamed to "Completed" |
| T-007 | 2026-05-03 | `fix(dashboard)`: tone badge "Watch"→"Review first", "Plan"→"Getting started"; all 7 branches audited |
| T-005 | 2026-05-03 | `fix(dashboard)`: new tab default when queue empty; neutral tone at < 5 attempts |
| T-004 | 2026-05-03 | `chore(theme)`: verified casual elements (CatGreeting, "powered by cats") already removed; --accent-secondary unused in components |
| T-003 | 2026-05-03 | `fix(srs)`: explicit `NO:OPTIMAL`=0.8 and `NO:SUBOPTIMAL`=0.8 entries (defensive against direct API calls); 2 new unit tests (55 total) |
| T-011 | 2026-05-03 | `fix(srs)`: verified trace comment in `computeNewStability`; solved+optimal+confidence-5 → 5.6 days matches README table |
| T-015 | 2026-05-03 | `chore(meta)`: OG + Twitter card metadata added to layout.tsx |
| —     | 2026-04-22 | `fix(readiness)`: sample weight scales score with data volume |
| —     | 2026-04-22 | `fix(readiness)`: show tier from day one, D is honest starting grade |
| —     | 2026-04-22 | `feat(hosting)`: user cap, Supabase keep-alive cron, waitlist page |
| —     | 2026-04-22 | `feat(nav)`: improve profile menu with identity header, GitHub sync status |
| —     | 2026-04-22 | `feat(onboarding)`: persist tour completion in DB, fix stability message |
| —     | 2026-04-22 | `fix(dashboard)`: calm strategy recommendation UI |
