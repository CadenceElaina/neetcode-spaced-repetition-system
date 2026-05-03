# Task Queue — Aurora

Agents and sessions pull from this file. Claim a task by adding your session ID to the Agent column.
**Canonical task file** — root `TASKS.md` is a mirror. Edit only this one.

Last updated: 2026-05-03 — all tasks complete

---

## Priority Tiers

| Tier | Label       | Description                                                   |
| ---- | ----------- | ------------------------------------------------------------- |
| P0   | 🔴 Critical | Bug that breaks a core flow or corrupts data                  |
| P1   | 🟠 High     | Bug or UX issue visible to a first-time user or the professor |
| P2   | 🟡 Medium   | Polish, copy quality, secondary UX                            |
| P3   | 🟢 Low      | Nice-to-have, tests, docs                                     |

---

## Open Tasks

### Algorithm

| ID  | Priority | Description | Scope Hints | Acceptance Criteria |
| --- | -------- | ----------- | ----------- | ------------------- |

### UX / Feature Verification

| ID  | Priority | Description | Scope Hints | Acceptance Criteria |
| --- | -------- | ----------- | ----------- | ------------------- |

### Tests / Docs

| ID  | Priority | Description | Scope Hints | Acceptance Criteria |
| --- | -------- | ----------- | ----------- | ------------------- |

---

## In Progress

| ID  | Agent | Description |
| --- | ----- | ----------- |

---

## Done

| ID    | Completed  | Description                                                                                                                             |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| T-018 | 2026-05-03 | `ux`: unified demo/onboarding/sign-in flow + first-login empty-state treatment                                                          |
| T-017 | 2026-05-03 | `docs`: CURRENT.md synced with session; CLAUDE.md updated to point to docs/TASKS.md                                                     |
| T-001 | 2026-05-03 | `fix(dashboard)`: `pickMockProblems` always returns 2; Medium+Medium fallback when no Hards; `pickTwo` deduplication via index-swap     |
| T-002 | 2026-05-03 | `fix(srs)`: `PARTIAL:NONE` multiplier corrected 1.0→1.1; unit tests covering all four PARTIAL combos                                    |
| T-008 | 2026-05-03 | `fix(dashboard)`: readiness "limited data" label; consistency raw fraction; Setup Guide to user menu (T-006 covered)                    |
| T-006 | 2026-05-03 | `fix(nav)`: Setup Guide moved to authenticated user menu dropdown; removed from primary nav slot                                        |
| T-016 | 2026-05-03 | `fix(nav)`: avatar `<img>` → `next/image`; add avatars.githubusercontent.com to remotePatterns                                          |
| T-009 | 2026-05-03 | `fix(dashboard)`: "Done" tab renamed to "Completed"                                                                                     |
| T-007 | 2026-05-03 | `fix(dashboard)`: tone badge "Watch"→"Review first", "Plan"→"Getting started"; all 7 branches audited                                   |
| T-005 | 2026-05-03 | `fix(dashboard)`: new tab default when queue empty; neutral tone at < 5 attempts                                                        |
| T-004 | 2026-05-03 | `chore(theme)`: verified casual elements (CatGreeting, "powered by cats") already removed; --accent-secondary unused in components      |
| T-003 | 2026-05-03 | `fix(srs)`: explicit `NO:OPTIMAL`=0.8 and `NO:SUBOPTIMAL`=0.8 entries (defensive against direct API calls); 2 new unit tests (55 total) |
| T-011 | 2026-05-03 | `fix(srs)`: verified trace comment in `computeNewStability`; solved+optimal+confidence-5 → 5.6 days matches README table                |
| T-015 | 2026-05-03 | `chore(meta)`: OG + Twitter card metadata added to layout.tsx                                                                           |
| T-010 | 2026-05-03 | `fix(dashboard)`: Log button added to Completed tab; all three entry points verified                                                    |
| T-012 | 2026-05-03 | `verified`: import parsing (tab + cell-per-line), dupe detection, SRS update all functional                                             |
| T-013 | 2026-05-03 | `verified`: video link prominent; optimal complexity shown on detail page; complexity comparison N/A (field deprecated)                 |
| T-014 | 2026-05-03 | `test(api)`: 5 Vitest tests for POST /api/attempts (401, 400×2, 409, 201); 93 total tests passing                                       |
| —     | 2026-04-22 | `fix(readiness)`: sample weight scales score with data volume                                                                           |
| —     | 2026-04-22 | `fix(readiness)`: show tier from day one, D is honest starting grade                                                                    |
| —     | 2026-04-22 | `feat(hosting)`: user cap, Supabase keep-alive cron, waitlist page                                                                      |
| —     | 2026-04-22 | `feat(nav)`: improve profile menu with identity header, GitHub sync status                                                              |
| —     | 2026-04-22 | `feat(onboarding)`: persist tour completion in DB, fix stability message                                                                |
| —     | 2026-04-22 | `fix(dashboard)`: calm strategy recommendation UI                                                                                       |
