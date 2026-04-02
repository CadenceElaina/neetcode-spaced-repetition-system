# NeetcodeSRS

**Free, open-source spaced repetition for LeetCode interview prep.**

NeetcodeSRS tracks what you've solved, predicts what you're forgetting, and schedules reviews automatically — so you spend time on problems that need work, not problems you already know.

Built around the NeetCode 150 with a modified [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) algorithm, structured attempt logging, and an interview readiness score.

---

## How It Works

1. **Solve a problem** on LeetCode.
2. **Log the attempt** — two options:
   - **Import from NeetCode** (fastest): [neetcode.io/profile](https://neetcode.io/profile) → click a date on the activity calendar (or Roadmap → Calendar → date). On the activity page, select from below the date through the problem list, copy, and paste into the Import tab. Bulk-imports all problems for that day.
   - **Manual**: Click "Review" or "Start" on the dashboard and fill out the attempt form (outcome, complexity, code, notes).
3. **The algorithm schedules reviews.** Struggled? Back in 1–3 days. Nailed it? Weeks, then months. Intervals grow as you prove retention.
4. **Track readiness** — see your tier (S–D), weak categories, review queue, and pace toward your target interview date.

---

## Features

- **NeetCode 150** — categories, difficulty, LeetCode/NeetCode links, video explanations, verified optimal time & space complexity, Blind 75 flags
- **Attempt logging** — outcome (solved/partial/no), solution quality, complexity comparison, solve time, rewrite-from-scratch signal, confidence, code, notes
- **Spaced repetition** — FSRS-based scheduling adapted for coding problems (see [Algorithm](#algorithm) below)
- **Readiness dashboard** — tier score, coverage, retention, category balance, consistency, capacity-adjusted pace projection toward a configurable target date
- **Mock interviews** — random medium + hard from weak categories, 45-minute timer
- **Pattern drills** — focused practice on a single category, sorted weakest-first
- **NeetCode import** — paste activity from neetcode.io to bulk-log problems

---

## Algorithm

The scheduling engine is in [`src/lib/srs.ts`](src/lib/srs.ts). Full design rationale is in [`docs/PLAN.md`](docs/PLAN.md) §6–7.

### Retrievability

$$R(t) = e^{-t/S}$$

$R$ = probability you can solve the problem today. $t$ = days since last review. $S$ = stability (days until R decays to ~37%).

### Stability Update

$$S_{\text{new}} = S_{\text{old}} \times \text{multiplier} \times \text{modifier}$$

**Multipliers** (by outcome × quality):

| Outcome    |        Optimal         | Brute Force | No Solution |
| ---------- | :--------------------: | :---------: | :---------: |
| Solved     |          2.5×          |    1.5×     |      —      |
| Partial    | 1.1× (quality ignored) |    1.1×     |      —      |
| Not solved |           —            |    0.8×     |    0.5×     |

**Modifiers** (independent solves only): rewrote from scratch (+0.5), correct time complexity (+0.2), correct space complexity (+0.2), fast solve (+0.2). **Confidence** (all attempts): level 5 (+0.3), level 4 (+0.1), level 2 (−0.2), level 1 (−0.4). Stability clamped to [0.5, 365] days.

Partial + confidence ≤ 2 forces next review in 1 day. "Could not solve" is due immediately.

### Readiness Score

Weighted composite (0–100):

| Component        | Weight | Measures                                         |
| ---------------- | :----: | ------------------------------------------------ |
| Coverage         |  30%   | % of NeetCode 150 attempted                      |
| Retention        |  40%   | % of attempted problems with R > 0.7             |
| Category Balance |  20%   | Lowest category average R                        |
| Consistency      |  10%   | % of scheduled reviews completed (14-day window) |

**Tiers**: S ≥ 90 · A ≥ 75 · B ≥ 55 · C ≥ 35 · D < 35

### Coverage Projection

The dashboard projects how many unique problems you'll cover by your target date using a **capacity-adjusted day-by-day simulation**:

1. **Daily capacity** = your average attempts/day (last 30 days)
2. **Daily review load** = `learning_problems / avg_stability + mastered_problems / 30`
3. **Available for new** = `capacity − review_load` (floored at 0)
4. Each simulated day: new problems enter the learning pool, increasing future review load
5. Stability grows over time as reviews strengthen retention, gradually reducing review frequency
6. Problems "graduate" to mastered (stability ≥ 30d), freeing capacity

This captures the key dynamic: as you learn more problems, reviews consume more of your daily budget, naturally slowing the rate of new problem acquisition — then mastery gradually frees capacity back up.

---

## Tech Stack

| Layer     | Technology              | Purpose                              |
| --------- | ----------------------- | ------------------------------------ |
| Framework | Next.js 16 (App Router) | Full-stack React with SSR/API routes |
| Language  | TypeScript              | End-to-end type safety               |
| Database  | PostgreSQL (Supabase)   | Users, problems, attempts, SRS state |
| ORM       | Drizzle                 | Type-safe SQL-like queries           |
| Auth      | NextAuth v5             | GitHub OAuth                         |
| Styling   | Tailwind CSS 4          | Utility-first CSS                    |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or free [Supabase](https://supabase.com) account)
- Python 3.10+ (data pipeline only)

### Setup

```bash
git clone https://github.com/CadenceElaina/neetcode-spaced-repetition-system.git
cd neetcode-spaced-repetition-system
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- **DATABASE_URL** — Supabase connection string (Project Settings → Database → URI)
- **AUTH_SECRET** — run `npx auth secret`
- **AUTH_GITHUB_ID / AUTH_GITHUB_SECRET** — [create a GitHub OAuth app](https://github.com/settings/developers) (callback: `http://localhost:3000/api/auth/callback/github`)

Push schema and seed problems:

```bash
npx drizzle-kit push
npx tsx scripts/seed.ts
```

> If `drizzle-kit push` crashes on check constraints (known issue), use `npx drizzle-kit generate` and apply the SQL manually.

Start the dev server:

```bash
npm run dev
```

`seed.ts` inserts the 150 NeetCode problem rows only — no user data. Fresh installs start with a clean slate.

### Regenerate Problem Data (optional)

```bash
python scripts/fetch_problems.py
```

Downloads metadata from [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode) (MIT). No scraping, no API keys.

---

## Project Structure

```
problems.json                  # 150 problems with metadata + complexity
docs/
  PLAN.md                      # Full design doc (algorithm, architecture, roadmap)
  STATUS.md                    # Implementation status
  STYLE_GUIDE.md               # Design system
scripts/
  fetch_problems.py            # Data pipeline
  seed.ts                      # Seeds problem metadata into Postgres
src/
  lib/srs.ts                   # Core SRS engine (stability, retrievability, readiness)
  db/schema.ts                 # Drizzle schema
  app/
    dashboard/                 # Dashboard (queue, stats, readiness)
    problems/                  # Problem list, detail, attempt form
    drill/                     # Pattern drill mode
    mock-interview/            # Timed mock interview
    api/attempts/              # Attempt logging + SRS update
    api/notes/                 # Per-user problem notes
    api/review/                # Review queue + skip endpoint
```

---

## Contributing

Contributions welcome. See [docs/PLAN.md](docs/PLAN.md) for architecture decisions, edge cases, and roadmap.

Areas where help is useful: algorithm tuning, complexity verification, UI/UX, mobile responsiveness.

---

## Glossary

| Term                  | Definition                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Spaced Repetition** | A learning technique where reviews are scheduled at increasing intervals. Each successful review pushes the next one further out. |
| **FSRS**              | Free Spaced Repetition Scheduler — an open-source algorithm by Jarrett Ye. NeetcodeSRS uses a modified multi-signal version.      |
| **Stability**         | How durable your memory of a problem is, in days. Higher = slower forgetting = longer review intervals.                           |
| **Retrievability**    | Estimated probability (0–100%) you could solve a problem right now. Decays exponentially since last review. Floored at 30%.       |
| **Forgetting Curve**  | The graph of retrievability over time (exponential decay). First measured by Ebbinghaus in 1885.                                  |
| **NeetCode 150**      | A curated list of 150 LeetCode problems covering all major interview topics, organized by category.                               |
| **Blind 75**          | A subset of 75 most frequently asked coding interview problems. Given a small priority bonus in the review queue.                 |
| **Readiness Score**   | A 0–100 composite of coverage (30%), retention (40%), category balance (20%), and consistency (10%). Maps to tiers S through D.   |

For a detailed walkthrough with examples, see the [How It Works](https://leetcode-spaced-repetition-system.vercel.app/info) page in the app.

---

## License

MIT

## Acknowledgments

- [NeetCode](https://neetcode.io) — curated problem lists and category structure
- [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode) — open-source problem metadata (MIT)
- [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) by Jarrett Ye — spaced repetition research foundation
