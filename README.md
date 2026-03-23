# LeetcodeSRS (System Repetition System)

**A free, open-source spaced repetition tracker for LeetCode interview prep.**

LeetRepeat helps you move beyond "I solved it once" to "I actually retained it." It combines the NeetCode 150 problem set with a science-backed spaced repetition algorithm, structured attempt logging, and honest interview readiness scoring — so you always know exactly where you stand.

---

## The Problem

You've ground through 80 LeetCode problems. But can you solve Two Sum right now, from memory, in under 10 minutes? What about that graph problem you did three weeks ago?

Existing tools leave gaps:

- **LeetCode** tracks submissions but not retention. You can't tell which problems are fading.
- **NeetCode** gives you a curated list and great explanations but no spaced review system.
- **Anki** does spaced repetition but handles code terribly — no syntax highlighting, no structured problem metadata, no complexity tracking.
- **Spreadsheets** require manual scheduling and fall apart at scale.

LeetRepeat fills all of these gaps in one place, for free.

---

## How It Works

1. **Work a problem** on LeetCode as normal.
2. **Log your attempt** in LeetRepeat — did you solve it independently? What was your approach? What's the time complexity? Paste your code and notes.
3. **The algorithm schedules your review.** Problems you struggled with come back in 1–3 days. Problems you nailed come back in weeks, then months. The intervals grow as you prove retention.
4. **Check your dashboard** to see your readiness score, weak categories, problems due today, and whether you're on pace for your target interview date.

---

## Features

### Problem Database

- Full NeetCode 150 with categories, difficulty, LeetCode/NeetCode links, video explanations, and verified optimal time & space complexity for every problem.
- Blind 75 subset flagged for focused prep.
- NeetCode 250 support planned.

### Structured Attempt Logging

Every attempt captures:

- Whether you solved independently (Yes / Partial / No)
- Solution quality (Optimal / Suboptimal / Brute Force / No Solution)
- Your time & space complexity answers — auto-compared against known optimal
- Solve time and study time
- Whether you could rewrite the solution from scratch
- Confidence level (1–5)
- Your code (syntax-highlighted editor)
- Notes and scratch work (Markdown)

### Spaced Repetition Scheduling

Based on FSRS (Free Spaced Repetition Scheduler) — the same research behind modern Anki — adapted for coding problems. Each problem has a **stability** value that determines when you'll see it next:

- Solved independently with optimal solution? Stability increases significantly.
- Rewrote from scratch successfully? Largest stability boost (strongest signal of true understanding).
- Couldn't solve it? Stability stays low — you'll see it again soon.

The result: you spend time on problems you're forgetting, not problems you already know.

### Mock Interview & Drill Modes

- **Mock interview mode** — random medium + hard from your weak categories with a 45-minute timer. Simulates real interview conditions.
- **Pattern-based drill mode** — focused sessions on a single pattern or category (e.g., "Practice all sliding window problems").
- **Skip with reason** — skip a review problem that feels wrong for today without losing it. It re-enters the queue at lower priority.

### Study Plan & Scheduling

- **Study plan generator** — "Here's your 12-week plan to go from D to B" with weekly targets broken down by category.
- **Weekly review summary** — in-app digest of what's due, where retention is slipping, and what to focus on. Optional calendar integration (Google Calendar / .ics export) for scheduling review blocks.
- **Review feedback** — tell the algorithm "this came back too early / too late" to help it learn your pace.

### Interview Readiness Dashboard

Set a target date (e.g., "I'm applying in October 2026") and the app tells you:

- **Your tier** — S through D, calibrated against real interview expectations
- **Coverage** — which categories you've hit, which have gaps
- **Retention** — what percentage of your solved problems you'd still pass today
- **Pace** — whether your current rate gets you ready in time
- **Weak spots** — categories with the lowest retention, surfaced automatically

### Readiness Tiers

| Tier  | Target                   | What It Means                                                          |
| ----- | ------------------------ | ---------------------------------------------------------------------- |
| **S** | FAANG / Top-tier         | NeetCode 150 mastered + deep into 250. Handles hards consistently.     |
| **A** | Unicorns / Top startups  | NeetCode 150 strong. Mediums solved confidently in 20 min.             |
| **B** | Mid-tier / Most startups | NeetCode 150 covered with solid retention. Comfortable with mediums.   |
| **C** | Getting there            | 75+ problems with moderate retention. Easies down, working on mediums. |
| **D** | Early stage              | Just starting or low retention across the board.                       |

---

## Tech Stack

| Layer      | Technology               | Purpose                                                               |
| ---------- | ------------------------ | --------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)  | Full-stack React with SSR and API routes                              |
| Language   | TypeScript               | Type safety across frontend and backend                               |
| Database   | PostgreSQL               | Relational data model for users, problems, attempts, and review state |
| ORM        | Drizzle                  | Type-safe, SQL-like queries in TypeScript                             |
| Auth       | NextAuth.js (Auth.js v5) | GitHub and Google OAuth                                               |
| Styling    | Tailwind CSS             | Utility-first CSS                                                     |
| Deployment | Vercel + Supabase        | Free-tier hosting for app and database                                |

---

## Project Structure

```
├── README.md
├── problems.json              # Seed data: 150 problems with metadata + complexity
├── docs/
│   ├── PLAN.md                # Detailed design doc (features, architecture, edge cases)
│   ├── STATUS.md              # Current implementation status vs. roadmap
│   ├── STYLE_GUIDE.md         # Design system (colors, typography, components)
│   └── ideas.md               # Feature ideas backlog
├── scripts/
│   ├── fetch_problems.py      # Data pipeline: fetches + verifies NeetCode problem data
│   └── seed.ts                # Seeds problems.json into Postgres (problem metadata only)
└── src/
    ├── app/
    │   ├── api/attempts/       # POST endpoint for logging attempts + SRS state update
    │   ├── api/auth/           # NextAuth route handler
    │   ├── api/notes/          # GET/PUT per-user problem notes
    │   ├── api/review/         # Review queue + skip-with-reason endpoint
    │   ├── dashboard/          # Unified dashboard (readiness, queue, stats)
    │   ├── drill/              # Pattern-based drill mode
    │   ├── mock-interview/     # Timed mock interview mode
    │   ├── problems/           # Problem list, detail, and attempt form
    │   ├── review/             # Focused review queue
    │   └── stats/              # Statistics and charts
    ├── components/             # Nav, theme toggle, badges, video embed
    ├── db/                     # Drizzle schema + connection
    └── lib/
        └── srs.ts              # Core SRS engine (stability, retrievability, readiness)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or a free [Supabase](https://supabase.com) account)
- Python 3.10+ (for the data pipeline only)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/leetrepeat.git
cd leetrepeat
npm install
```

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

You'll need:

- **DATABASE_URL** — Supabase connection string (Project Settings → Database → URI)
- **AUTH_SECRET** — run `npx auth secret` to generate
- **AUTH_GITHUB_ID / AUTH_GITHUB_SECRET** — [create a GitHub OAuth app](https://github.com/settings/developers) with callback URL `http://localhost:3000/api/auth/callback/github`

Push the schema and seed the problem database:

```bash
npx drizzle-kit push
npx tsx scripts/seed.ts
```

> **Note on `drizzle-kit push`:** If it crashes on check constraints (a known Drizzle issue), generate the SQL instead and apply it directly:
>
> ```bash
> npx drizzle-kit generate
> # Then apply the generated SQL in drizzle/0000_*.sql via your Postgres client or Supabase SQL editor
> ```

`scripts/seed.ts` only inserts the 150 NeetCode problem rows (titles, categories, URLs, complexity data). **It contains no user-specific data.** Every fresh install starts with a completely empty attempts and review-state database — your activity belongs only to your account, tied to your OAuth identity.

Start the dev server:

```bash
npm run dev
```

### Regenerate Problem Data

The seed data is already included in `problems.json`, but if you want to regenerate it from source:

```bash
python scripts/fetch_problems.py
```

This downloads problem metadata and optimal complexity data directly from the [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode) GitHub repo (MIT licensed). No scraping, no API keys required. Runs in seconds.

---

## Data Pipeline

The `scripts/fetch_problems.py` pipeline:

1. Downloads `.problemSiteData.json` from the NeetCode GitHub repo
2. Filters to the NeetCode 150 subset
3. Downloads the full repo as a ZIP archive (single HTTP request)
4. Extracts `hints/*.md` files containing optimal time & space complexity
5. Maps NeetCode's hint filenames to LeetCode problem slugs (74 of 150 use different naming)
6. Parses complexity values from HTML hint content
7. Runs verification checks against expected counts

**Output:** `problems.json` — 150 problems, each with:

- LeetCode number, title, category, difficulty
- LeetCode URL, NeetCode URL, video explanation ID
- Blind 75 flag
- Optimal time and space complexity

**Verification:** The pipeline checks that the output matches expected totals (150 problems, 75 Blind 75, 28 Easy / 101 Medium / 21 Hard, 18 categories) and reports any problems with missing data.

---

## Personal Data & Fresh Installs

The `scripts/seed.ts` script — the **only** script committed to this repository — inserts problem metadata only. It has no knowledge of any user's activity.

There are no migrations, schema changes, or committed data tied to any individual's usage history. If you use LeetRepeat for your own prep and want to backfill historical activity from before you started using the app, you can create a local `scripts/seed-my-history.ts` script following the same pattern as `seed.ts`. Add it to `.gitignore` immediately — it should never be committed since it contains personal data.

The `.gitignore` in this repo already excludes:

- `.env.local` and all `*.local` env files — your credentials and database URL
- `docs/context.md` — personal notes file
- Any `seed-my-history.ts` script

Fresh clones of this repo work with a clean slate.

---

## Who This Is For

- **CS students** preparing for internship or new grad interviews
- **Career changers** breaking into SWE from other fields
- **Anyone doing LeetCode** who wants to know they're actually retaining what they practice — not just checking boxes

You don't need to be targeting FAANG. The tier system meets you where you are and helps you work toward whatever level you're aiming for.

---

## Contributing

Contributions are welcome. See [docs/PLAN.md](docs/PLAN.md) for the full design document including architecture decisions, edge cases, and the development roadmap.

Areas where help is especially useful:

- Optimal complexity verification for edge-case problems
- Spaced repetition algorithm tuning and calibration
- UI/UX design for the review flow and dashboard
- Mobile responsiveness
- Additional language support for code storage (Python only at launch)

---

## License

MIT

---

## Acknowledgments

- [NeetCode](https://neetcode.io) for the curated problem lists and category structure
- [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode) for open-source problem metadata and hint data (MIT licensed)
- FSRS research by [Jarrett Ye](https://github.com/open-spaced-repetition/fsrs4anki) for the spaced repetition algorithm foundation
