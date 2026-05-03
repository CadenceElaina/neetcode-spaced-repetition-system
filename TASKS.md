# Aurora Ascent — Task Queue

**Session start:** `cd aurora && npx tsc --noEmit && npm test`
**Session end:** commit (Conventional Commits) + push before stopping.

Last updated: 2026-05-03 — initial queue from full audit

---

## Priority Tiers

| Tier | Label      | Description                                        |
| ---- | ---------- | -------------------------------------------------- |
| P0   | 🔴 Bug     | Wrong behavior — algorithm error, data corruption  |
| P1   | 🟠 Fix     | Broken or misleading feature                       |
| P2   | 🟡 UX      | Works but confusing, visually off, or incomplete   |
| P3   | 🟢 Feature | New capability or meaningful improvement           |
| P4   | ⚪ Polish  | Accessibility, performance, meta, cleanup          |

---

## Open Tasks

### Algorithm

| ID    | Priority | Description | File Scope | Acceptance Criteria |
|-------|----------|-------------|------------|---------------------|
| T-001 | 🔴 P0    | **`PARTIAL:NONE` multiplier is 1.0 — should be 1.1.** README and algorithm doc both state all PARTIAL outcomes → 1.1× regardless of quality. Currently the code has `"PARTIAL:NONE": 1.0` while `PARTIAL:OPTIMAL/SUBOPTIMAL/BRUTE_FORCE` all → 1.1. This is inconsistent and understates stability gain when a user partially solves but doesn't specify quality. | `src/lib/srs.ts`, `tests/unit/srs.test.ts` | Change `"PARTIAL:NONE": 1.0` → `1.1`. Add a unit test asserting all four PARTIAL combos produce the same new stability (confirming quality-independence). All 52 existing tests still pass. |
| T-002 | 🟠 P1    | **`NO:OPTIMAL` and `NO:SUBOPTIMAL` have no entry in `BASE_MULTIPLIERS`** — they silently fall through to `?? 1.0`. If the attempt form prevents these combinations (didn't solve + optimal quality is contradictory), document that in a comment. If they can be reached, add explicit entries with correct values. | `src/lib/srs.ts`, `src/components/log-attempt-modal.tsx` | Either: add `"NO:OPTIMAL": 0.8, "NO:SUBOPTIMAL": 0.8` matching `NO:BRUTE_FORCE` (user attempted something, just labeled wrong), OR verify the attempt form makes these unreachable and add a `// unreachable: form enforces...` comment. Add a unit test for the explicit behavior. |

### UI / Navigation

| ID    | Priority | Description | File Scope | Acceptance Criteria |
|-------|----------|-------------|------------|---------------------|
| T-003 | 🟡 P2    | **Setup Guide shows for all authenticated users.** It's a self-hosting wizard — active users who signed up via the hosted version (aurora-ascent.vercel.app) don't need it. It takes primary nav space away from product features. Move it to the user menu dropdown (below GitHub Sync) with a smaller link/icon, or gate it behind a "self-hosting" context. | `src/components/nav.tsx`, `src/components/setup-guide.tsx` | Setup Guide is no longer a top-level nav button for authenticated users. It's accessible (in user menu or via a small link in Settings-equivalent) but doesn't compete with Dashboard/Problems/Info in the primary nav. The self-host entry point on the landing page still works. |
| T-004 | 🟡 P2    | **Recommendation banner tone labels are jargon.** "WATCH" and "danger" are internal severity names exposed in the UI badge. Users don't know what WATCH means. Replace with user-facing language: "Stable" (good), "On Track" (neutral), "Review First" (watch), "Behind" (danger). The recommendation title/body can stay — only the badge text needs changing. | `src/app/dashboard/dashboard-client.tsx` | The WATCH badge reads something clear like "Review First" or "Action Needed". All four tone states have distinct, user-facing badge labels. Existing logic unchanged — only the string constants change. |
| T-005 | 🟡 P2    | **Queue Forecast "Growing" state has no actionable guidance.** When the forecast is growing (orange "Growing" badge), users see the scary chart but no prompt on what to do. Add a contextual nudge near the badge: "Clear your review queue before adding new problems to keep this stable." The Actual vs Goals toggle is also not explained anywhere. | `src/app/dashboard/dashboard-client.tsx` | When forecast status is "growing" or "behind", a one-line guidance note appears below the badge. The Goals toggle has a tooltip or label explaining what it projects. |
| T-006 | 🟡 P2    | **Consistency widget shows 4% with no context.** A user who hasn't reviewed in several days will see a very low consistency score. Without context ("14-day window — you completed N of M due reviews") the number reads like a broken metric. Add a subtitle to the Consistency row in the readiness breakdown showing the raw counts (e.g. "3 of 17 due reviews, last 14 days"). | `src/app/dashboard/dashboard-client.tsx`, `src/app/dashboard/page.tsx` | Consistency breakdown row shows its calculation window and raw fraction alongside the %. Users who haven't reviewed recently understand why the number is low. |
| T-007 | 🟡 P2    | **"Done" tab label is ambiguous.** "Done 33" reads as "Done today" at a glance but means "all completed problems". Rename to "Completed" to match the `completedProblems` data field and eliminate confusion with the daily done count. | `src/app/dashboard/dashboard-client.tsx` | The third tab reads "Completed 33" not "Done 33". The tab content and any internal references are consistent. |
| T-008 | 🟡 P2    | **New user empty state.** When a user has 0 attempts (first session), the Review tab is empty and the Readiness score shows D/0 which reads as broken. Default to the New tab on first load when `attemptedCount === 0`. Add a welcome card on the New tab explaining what to do first. | `src/app/dashboard/dashboard-client.tsx` | First-time users with 0 attempts land on New tab, not Review. A brief "Start here" nudge is visible at the top of the New problem list. The D/0 readiness state has a "Start solving to see your score" note instead of a bare 0. |

### Features / Verification

| ID    | Priority | Description | File Scope | Acceptance Criteria |
|-------|----------|-------------|------------|---------------------|
| T-009 | 🟠 P1    | **Verify Import flow end-to-end.** The NeetCode activity paste import is core UX. Manually test: paste real neetcode.io activity text → problems parse correctly → quick-confirm flow works → SRS state updates. Document any parsing edge cases found. | `src/app/import/import-client.tsx`, `src/app/dashboard/dashboard-client.tsx` | Import parses a pasted neetcode.io activity block correctly. Confirmed problems appear in Review or Done. Quick-confirm logs an attempt with sensible defaults. |
| T-010 | 🟠 P1    | **Verify Mock Interview flow.** Confirm it correctly picks 1 medium + 1 hard from weak categories, 45-min timer runs, log-from-mock flow works, and the "finished" state shows a debrief with both problem links. The HANDOFF noted a "1 problem" bug that may be fixed — confirm or fix. | `src/app/dashboard/dashboard-client.tsx` | Mock shows exactly 2 problems (1 medium, 1 hard). Timer counts down from 45:00. After finishing or time-expiring, both problems are shown with Log buttons. Logging from mock records an attempt correctly. |
| T-011 | 🟠 P1    | **Attempt form — verify all field combinations.** The log-attempt modal has many interdependent fields (solved/partial/no × quality × rewrite × confidence × time × complexity). Systematically test: NO outcome correctly hides quality options that don't apply; PARTIAL hides rewrite-from-scratch (not meaningful); confidence 1-5 slider works; time field accepts decimals. | `src/components/log-attempt-modal.tsx` | All field combinations produce valid SRS input. NO outcome prevents selecting OPTIMAL/SUBOPTIMAL quality (or shows those options greyed if reachable). PARTIAL does not show rewrite bonus field. Submitting any valid combination updates SRS state without 500 errors. |

### Performance

| ID    | Priority | Description | File Scope | Acceptance Criteria |
|-------|----------|-------------|------------|---------------------|
| T-012 | ⚪ P4    | **Dashboard query audit.** The dashboard page fetches a large `DashboardData` object. Verify the page.tsx queries are efficient: no N+1 on attempts, aggregations done in SQL not JS, `consistencyPct` calculation uses a single date-ranged query. Add a comment with estimated query count. | `src/app/dashboard/page.tsx` | No N+1 query patterns. The consistency window (14-day) uses a WHERE clause, not JS filter. Cold dashboard load (cache miss) issues ≤6 DB queries total. |
| T-013 | ⚪ P4    | **User avatar uses `<img>` not Next.js `<Image>`.** The nav's user menu renders the GitHub avatar with a raw `<img>` tag (unoptimized). Replace with `<Image>` from `next/image` with appropriate `width`/`height` and `unoptimized={false}` if from GitHub CDN. | `src/components/nav.tsx` | Avatar uses `next/image`. No ESLint `@next/next/no-img-element` warning on this element. |

### Accessibility & Polish

| ID    | Priority | Description | File Scope | Acceptance Criteria |
|-------|----------|-------------|------------|---------------------|
| T-014 | ⚪ P4    | **OG / social preview metadata.** The landing page and dashboard have no `og:image` or `twitter:card` tags. Add a basic social preview: title "Aurora — Spaced repetition for interview prep", description, and a 1200×630 static OG image (can be a simple dark-themed text card). | `src/app/layout.tsx`, `public/og.png` or Vercel OG | Pasting aurora-ascent.vercel.app into Twitter/Slack shows a title, description, and image preview. |
| T-015 | ⚪ P4    | **Keyboard navigation audit on dashboard.** The review queue list, tab switcher, and log modal must be navigable by keyboard. Specifically: Tab through queue items → Log button focusable; Escape closes the modal; The difficulty filter dropdown is keyboard accessible. | `src/app/dashboard/dashboard-client.tsx`, `src/components/log-attempt-modal.tsx` | All interactive elements reachable by Tab. Log modal closes on Escape. Filter dropdown opens with Enter/Space. No focus traps outside the modal. |
| T-016 | ⚪ P4    | **Learning facilitation review — problem detail page.** The problem detail page shows the attempt form. Verify it shows: link to NeetCode video, optimal complexity as a reference (not revealed before attempt), and a "Your answer vs optimal" comparison after logging. If the comparison is missing, add it to the post-attempt confirmation state. | `src/app/problems/[id]/page.tsx`, `src/app/problems/[id]/attempt/attempt-form.tsx` | Video link is prominent on problem detail. Optimal complexity is hidden before logging (or shown as a reference only after). After logging, the confirmation shows user's stated complexity vs optimal. |

---

## In Progress

| ID  | Priority | Agent | Description |
|-----|----------|-------|-------------|
| —   | —        | —     | —           |

---

## Done

| ID  | Priority | Completed  | Description | Outcome |
|-----|----------|------------|-------------|---------|
| —   | —        | —          | —           | —       |

---

## Multi-Agent Strategy

To finish today, run agents in parallel on independent task groups:

| Agent | Tasks | Files touched |
|-------|-------|---------------|
| Agent 1 | T-001, T-002 | `srs.ts`, `srs.test.ts` |
| Agent 2 | T-003, T-007, T-013 | `nav.tsx`, `dashboard-client.tsx` |
| Agent 3 | T-004, T-005, T-006, T-008 | `dashboard-client.tsx` only |
| Agent 4 | T-009, T-010, T-011 | Testing — report findings, fix issues in `log-attempt-modal.tsx` |
| Agent 5 | T-014, T-015, T-016 | `layout.tsx`, `attempt-form.tsx`, `public/` |

Agents 2 and 3 both touch `dashboard-client.tsx` — coordinate by giving Agent 2 only the nav section (top of file) and Agent 3 only the widget/tab section (middle). Or run sequentially: Agent 2 first (nav), then Agent 3 (widgets).
