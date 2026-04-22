# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Aurora is a full-stack SaaS app for technical interview prep. It tracks LeetCode problem-solving attempts and uses a modified FSRS (Free Spaced Repetition Scheduler) algorithm to schedule reviews — predicting when users will forget each problem and surfacing it just in time.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint

# Database
npx drizzle-kit push       # Push schema changes to DB
npx drizzle-kit generate   # Generate migration SQL

# Seeding
npx tsx scripts/seed.ts           # Seed 150 NeetCode problems
python scripts/fetch_problems.py  # Regenerate problem metadata
```

**Required env vars** (copy `.env.example` → `.env.local`):
- `DATABASE_URL` — Supabase Postgres connection string
- `AUTH_SECRET` — generate with `npx auth secret`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth app credentials

**Optional env vars:**
- `MAX_USERS` — integer cap on new sign-ups (e.g. `500`). Returning users always pass through. Unset = no limit.
- `CRON_SECRET` — secures `/api/cron/ping`. Generate with `openssl rand -base64 32`. Required in production if the Vercel cron is active.

## Tech Stack

Next.js 16 (App Router) + React 19 + TypeScript 5 (strict), Tailwind CSS 4, Drizzle ORM on Postgres (Supabase), NextAuth v5 (GitHub OAuth).

## Architecture

### Server vs. Client Component Split

Pages are server components that fetch data directly via Drizzle ORM and pass it to `*-client.tsx` counterparts. The pattern is:

```
app/dashboard/page.tsx        ← server: fetches DB data, calls auth()
app/dashboard/dashboard-client.tsx  ← client: "use client", handles interaction
```

Server components call `await auth()` for session; client components call `fetch()` to API routes for mutations.

### SRS Algorithm — the core of the app

`src/lib/srs.ts` contains everything. Key concepts:

- **Retrievability**: `R(t) = e^(-t/S)` — exponential decay of memory strength
- **Stability update**: prior stability × multipliers based on (solved × quality) + modifiers (confidence, time, rewrite flag)
- **Readiness score**: weighted composite (coverage 30%, retention 40%, category balance 20%, consistency 10%) → tiers S/A/B/C/D
- **Coverage projection**: day-by-day simulation of review load vs. learning capacity

When working on any scheduling/review feature, start here.

### Data Model

`src/db/schema.ts` defines the tables. Key ones:

- `problems` — 150 curated NeetCode problems (seeded, not user-created)
- `attempts` — every logged practice session (source: manual/github/import)
- `user_problem_state` — per-user SRS state (stability, retrievability, next review date)
- `pending_submissions` — raw data from GitHub webhook before processing

### Demo Mode

Unauthenticated users see fully functional demo data from `src/lib/demo-data.ts`. Pages check `session?.user?.id` and fall back to demo mode — no auth required to see the UI. Don't break this path when adding features.

### API Routes

All mutations go through `/api/*` routes:

| Route | Purpose |
|---|---|
| `POST /api/attempts` | Log attempt + compute SRS update |
| `GET/POST /api/notes` | User notes per problem |
| `GET/POST /api/review` | Review queue + skip |
| `POST /api/webhook/github` | GitHub push webhook (HMAC-validated, auto-detects solved problems) |
| `GET /api/cron/ping` | Supabase keep-alive DB ping (Vercel cron, every 3 days) |

### GitHub Sync

`/api/webhook/github` receives push events from NeetCode's GitHub integration, validates the HMAC signature, parses filenames to detect solved problems, and stores them in `pending_submissions`. Users connect their GitHub repo via `/api/github-sync`.

## Key Files

- `src/lib/srs.ts` — SRS algorithm engine
- `src/db/schema.ts` — full data model (enums, columns, relations)
- `src/auth.ts` — NextAuth config with DrizzleAdapter
- `src/app/dashboard/demo-data.ts` — demo mode data
- `docs/ARCHITECTURE.md` — detailed system design and algorithm math
- `docs/decisions/` — ADRs explaining major design choices

# Project instructions

## Interaction modes

### Planning mode (default)
When I describe a problem or feature without an explicit instruction to proceed,
enter planning mode before writing any code:
- Identify edge cases and failure modes I may not have considered
- Surface relevant tradeoffs (performance, complexity, maintainability)
- Suggest alternative approaches if a better path exists
- Flag any security or data integrity concerns
- Ask **one** clarifying question if intent is ambiguous — never multiple at once

Present a concise plan and wait for my approval before proceeding.

### Execute mode
When I say `go`, `proceed`, `just do it`, or similar — skip planning and implement
directly. Apply best practices silently.

## Communication style
- **Assume I don't know something unless I demonstrate that I do.** If a concept,
  pattern, or syntax choice is non-obvious, explain it briefly. Do not assume
  familiarity with advanced patterns, obscure APIs, or language-specific idioms.
- When introducing a non-trivial approach, explain *why* it's the right choice
  and what the alternatives are — not just what the code does.
- Never ask more than one clarifying question per response.

## After implementation

### Commits
Once a task is complete, stage all relevant changes and commit using
Conventional Commits format, then push to the current branch:

```bash
git add -A
git commit -m "<type>(<scope>): <short description>"
git push
```

Commit types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

- Subject line under 72 characters
- If the change is non-trivial, add a short body explaining the *why*
- Atomic commits — one logical change per commit
- Do not bundle unrelated changes into a single commit

## Code quality
- Do not refactor code outside the scope of the current task
- If a change introduces a known limitation or TODO, call it out explicitly
- If test coverage should be added or updated, flag it — do not silently skip
- If a change affects a public API, type signature, or documented behavior,
  note that docs may need updating
- Prefer explicit over clever — readability is the priority in this codebase