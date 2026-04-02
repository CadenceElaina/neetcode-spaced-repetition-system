# Submission Methods — Manual, Import, GitHub Webhook

**Date:** 2026-04-02
**Status:** Accepted

---

## Overview

There are three ways attempts enter the system. Each path ends at the same `POST /api/attempts` endpoint and produces the same `attempt` + `userProblemState` update.

```
┌──────────────────────────────────────────────────────────┐
│                    Attempt Sources                        │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌─────────────────────┐  │
│  │  Manual   │   │  Import  │   │  GitHub Webhook     │  │
│  │  Form     │   │  (paste) │   │  (auto-detect)      │  │
│  └────┬─────┘   └────┬─────┘   └──────────┬──────────┘  │
│       │               │                    │             │
│       │               │           ┌────────▼─────────┐   │
│       │               │           │ Pending Queue    │   │
│       │               │           │ (confirm/dismiss)│   │
│       │               │           └────────┬─────────┘   │
│       │               │                    │             │
│       ▼               ▼                    ▼             │
│  ┌──────────────────────────────────────────────────┐    │
│  │          POST /api/attempts                       │    │
│  │  → Duplicate check (calendar-day, bypassable)     │    │
│  │  → Insert attempt row                             │    │
│  │  → Compute SRS update                             │    │
│  │  → Upsert userProblemState                        │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Manual (Full Form)

**Path:** `/problems/[id]/attempt` → form submit → `POST /api/attempts`

**Source tag:** `manual`

**What the user provides:** Outcome, quality, solve time, study time, rewrite flag, confidence (1–5), optional code + notes.

**Duplicate check:** Calendar-day. If the same user + problem has an attempt today, returns 409 with the existing attempt's timestamp. User sees:

> "You attempted this at 7:04 AM earlier today. Is this a new review attempt?"

User can force-submit ("Yes, Log New Attempt") to bypass.

---

## 2. Import (NeetCode Activity Paste)

**Path:** Copy NeetCode activity table → paste into import page → confirm → `POST /api/attempts` per item

**Source tag:** `import`

**How it works:**

1. User copies the NeetCode activity table from the browser
2. Parser extracts rows: problem name, status, time-of-day strings
3. Fuzzy-matches problem names to the database (Levenshtein distance ≤ 3)
4. Groups multiple submissions of the same problem into sessions

**Session splitting (60-min gap rule):**

```
is-anagram  10:05 AM ─┐
is-anagram  10:08 AM  ├─ Same session (gap < 60 min) → 1 attempt
is-anagram  10:12 AM ─┘
                         ← 3 hour gap →
is-anagram   1:30 PM ─── Separate session → 2nd attempt
```

If the gap between consecutive submissions of the same problem exceeds **60 minutes**, they're treated as separate review attempts. Within 60 minutes, only the latest submission counts (same coding session, multiple submits).

**Duplicate check:** Pre-scan checks which problems already have attempts logged today. Those are pre-marked as "skipped" with a "Log anyway" override button.

**Date limitation:** NeetCode activity only provides time-of-day strings (e.g., "10:05 AM"), not full dates. Import assumes all pasted rows are from today.

---

## 3. GitHub Webhook (Automatic Detection)

**Path:** NeetCode commits to GitHub repo → webhook fires → pending created → user confirms on dashboard → `POST /api/attempts`

**Source tag:** `github`

**How it works:**

1. User connects their NeetCode submissions repo in settings
2. System generates a per-user HMAC-SHA256 webhook secret
3. On every push, GitHub sends commit data to `/api/webhook/github`
4. Handler parses commit messages (`Add: {slug} - submission-{N}`)
5. Matches slug to problem via `neetcodeUrl`
6. Creates `pendingSubmission` row if it passes dedup checks
7. Dashboard shows pending notification banner
8. User clicks **Quick confirm** (defaults) or **Full form** (detailed)

### Webhook Dedup Pipeline

Each commit goes through four checks in order. First failure → skip.

```
Commit received
    │
    ▼
┌─────────────────────────────────┐
│ 1. Before connection time?      │──YES──→ SKIP
│    commit.timestamp < connectedAt│
└─────────────┬───────────────────┘
              │ NO
              ▼
┌─────────────────────────────────┐
│ 2. Same commit SHA exists?      │──YES──→ SKIP
│    (exact duplicate webhook)    │
└─────────────┬───────────────────┘
              │ NO
              ▼
┌─────────────────────────────────┐
│ 3. Unresolved pending for same  │──YES──→ SKIP
│    problem within 60 min?       │
│    (status = 'pending')         │
└─────────────┬───────────────────┘
              │ NO
              ▼
┌─────────────────────────────────┐
│ 4. Logged attempt for same      │──YES──→ SKIP
│    problem within 60 min?       │
│    (checks attempts table)      │
└─────────────┬───────────────────┘
              │ NO
              ▼
        CREATE PENDING
```

### Why 60-min window (not "any time")?

NeetCode users often submit the same problem multiple times in a single coding session (debugging, optimizing). These are the same review — not separate practice sessions. The 60-minute window matches the import session-splitting logic for consistency.

**The window applies to both checks (#3 and #4) intentionally:**

| Scenario                                                 | What happens                                     |
| -------------------------------------------------------- | ------------------------------------------------ |
| Submit problem, submit again 5 min later                 | Second commit skipped (same session)             |
| Submit problem, quick-confirm, submit again 10 min later | Skipped — attempt exists within 60 min           |
| Submit problem at 7 AM, submit again at 2 PM             | New pending created (>60 min gap = new session)  |
| Pending from yesterday never confirmed, submit today     | New pending created (old pending outside window) |
| Pending sitting for 2 hours unconfirmed, submit again    | New pending created (old pending outside window) |

### Quick Confirm vs Full Form

|                        | Quick Confirm        | Full Form           |
| ---------------------- | -------------------- | ------------------- |
| Outcome                | Solved independently | User chooses        |
| Quality                | Optimal              | User chooses        |
| Confidence             | 3                    | User chooses        |
| Solve time             | 20 min               | User enters         |
| Force duplicate bypass | Yes (always)         | Shows warning first |

Quick confirm sends `force: true` to bypass the calendar-day duplicate check, since GitHub submissions inherently represent additional solves.

---

## Interaction Between Methods

### Same problem, same day — different sources

```
7:00 AM  Manual attempt logged (form)
7:15 AM  NeetCode commit arrives (webhook)
         → Attempt exists within 60 min → SKIP (no notification)

7:00 AM  Manual attempt logged (form)
2:00 PM  NeetCode commit arrives (webhook)
         → No attempt within 60 min → CREATE PENDING
         → User confirms → duplicate warning shows "attempted at 7:00 AM"
         → User can force-submit if it's genuinely a new session
```

### Import + Webhook on same day

```
Morning: User solves 5 problems on NeetCode
         Webhook creates 5 pending submissions

         User opens import, pastes activity
         Import pre-marks all 5 as "already logged today" (if confirmed)
         OR user confirms pendings first, then import sees them as dupes
```

### Attempt deletion and SRS rebuild

When an attempt is deleted (via activity page × button):

- If other attempts remain: SRS state is **replayed from scratch** — stability, best quality, next review date are all recomputed from the remaining attempt history
- If no attempts remain: the `userProblemState` row is deleted entirely (problem returns to "New")

---

## Constants

| Constant         | Value         | Used by             | Purpose                                                  |
| ---------------- | ------------- | ------------------- | -------------------------------------------------------- |
| Session gap      | 60 min        | Import, Webhook     | Same problem submissions closer than this = same session |
| Duplicate window | Calendar day  | Manual form, Import | Warns if problem already logged today                    |
| Force bypass     | `force: true` | All paths           | Skips calendar-day duplicate check                       |
