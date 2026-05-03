# Current Implementation State — Aurora Ascent

**Last updated: 2026-05-03 — pre-presentation polish phase**

Read this before every work session. Update it after every session.

---

## In Progress

_None — ready for next task._

---

## Known Bugs / Issues

| Severity | Area | Description |
|---|---|---|
| Medium | Mock Interview | Shows 1 problem instead of the advertised 2 — pickMockProblems requires both a medium AND a hard; fails silently when hard candidates are scarce |
| Low | Theme | Landing page has cat ASCII face + ":3" tone that is too casual for a public SWE tool |
| Low | Theme | Footer "powered by cats 🐱" needs removal |
| Low | Theme | `--accent-secondary` (pink) used too prominently in UI elements; should be accent-only in gradients/hover |
| Low | Cold start | New users land on Review tab (empty/confusing); should default to New tab when reviewQueue.length === 0 |

---

## Recently Completed

| Date | Change |
|---|---|
| 2026-04-22 | HANDOFF.md written — meeting strategy, research paths, infra limits documented |
| 2026-04-22 | feat(onboarding): persist tour completion in DB, fix stability message |
| 2026-04-22 | feat(nav): improve profile menu with identity header, grouped actions, GitHub sync status |
| 2026-04-22 | feat(hosting): user cap, Supabase keep-alive cron, waitlist page |
| 2026-04-22 | fix(dashboard): calm strategy recommendation UI |
| 2026-04-22 | fix(readiness): show tier from day one, D is the honest starting grade |

---

## Next Iteration Candidates

| Priority | Area | Task |
|---|---|---|
| P0 | Bug | Fix Mock Interview — ensure 1 medium + 1 hard always selected; handle scarce hard pool gracefully |
| P1 | Theme | Remove cat greeting from landing page; remove "powered by cats" from footer; dial back pink |
| P1 | Cold start | Default to New tab when review queue is empty (new users); suppress "Behind" urgency badge when < 5 attempts |
| P1 | Algorithm | Audit SRS multipliers end-to-end — trace a representative attempt through `computeNewStability` and verify stability update matches README table |
| P2 | Topbar | Polish `PracticeRecommendationPanel` — review copy, tone labels, and actionability of each branch |
| P2 | Widgets | Review Readiness breakdown bar styling and accuracy display at low data volumes |
| P2 | UX | "Log" button: verify attempt modal pre-fills problem context correctly in all list modes |
| P3 | Tests | Add API route tests for `/api/attempts` (SRS update path) as described in TEST_PLAN.md |
| P3 | Scale | Document Supabase upgrade path for when class pilot is confirmed |

---

## Product Goals (Professor Presentation)

**Primary goal:** Email Dr. Wilson mid-summer 2026. Show Aurora Ascent as a working, polished product. Pitch Aurora Research as a Fall 2026 pilot. Get her buy-in.

**What "done" means for Ascent:**
- No visible bugs in any flow a professor would click through
- Algorithm behaves correctly and is explainable
- UI is professional (not childish) — clean purple aesthetic, minimal pink
- All features in the README actually work
- Cold-start experience for a new user is smooth and not confusing

**Scale expectations:** Aurora Ascent is public/open-source; Aurora Research (private repo) handles the classroom pilot with invite-only auth.

---

## Infra Limits to Watch

| Risk | Status |
|---|---|
| Supabase pause after 7 days inactivity | Mitigated — cron ping every 3 days via vercel.json |
| MAX_USERS cap | Currently 500, enforced in src/auth.ts |
| Vercel free tier function invocations | 1M/month; low risk at current scale |

---

## Tests

- `tests/unit/srs.test.ts` — 52 SRS unit tests (passing)
- No API, component, or E2E tests yet (see hidden-docs/TEST_PLAN.md for roadmap)

Run: `npm test`
