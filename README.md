# Aurora

**Free, open-source spaced repetition for technical interview prep.**

Aurora tracks what you've solved, predicts what you're forgetting, and schedules reviews automatically — so you spend time on problems that need work, not problems you already know.

Built around 150 curated LeetCode problems with a modified [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) algorithm, structured attempt logging, and an interview readiness score.

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Algorithm](#algorithm)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [GitHub Sync (Optional)](#github-sync-optional)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Glossary](#glossary)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## How It Works

1. **Solve a problem** on LeetCode.
2. **Log the attempt** — three options:
   - **GitHub Sync** (automatic): Connect your NeetCode submissions repo. Solved problems appear as pending on your dashboard for quick confirmation. See [GitHub Sync](#github-sync-optional) below.
   - **Import from NeetCode** (fastest): [neetcode.io/profile](https://neetcode.io/profile) → click a date on the activity calendar (or Roadmap → Calendar → date). On the activity page, select from below the date through the problem list, copy, and paste into the Import tab. Bulk-imports all problems for that day.
   - **Manual**: Click "Review" or "Start" on the dashboard and fill out the attempt form (outcome, complexity, code, notes).
3. **The algorithm schedules reviews.** Struggled? Back in 1–3 days. Nailed it? Weeks, then months. Intervals grow as you prove retention.
4. **Track readiness** — see your tier (S–D), weak categories, review queue, and pace toward your target interview date.

---

## Features

- **150 curated problems** — categories, difficulty, LeetCode/NeetCode links, video explanations, verified optimal time & space complexity, Blind 75 flags
- **Attempt logging** — outcome (solved/partial/no), solution quality, complexity comparison, solve time, rewrite-from-scratch signal, confidence, code, notes
- **Spaced repetition** — FSRS-based scheduling adapted for coding problems (see [Algorithm](#algorithm) below)
- **Readiness dashboard** — tier score, coverage, retention, category balance, consistency, capacity-adjusted pace projection toward a configurable target date
- **Mock interviews** — random medium + hard from weak categories, 45-minute timer
- **Activity import** — paste activity from neetcode.io to bulk-log problems
- **GitHub sync** — auto-detect NeetCode submissions via webhook, confirm from dashboard

---

## Algorithm

The scheduling engine is in [`src/lib/srs.ts`](src/lib/srs.ts). Full design rationale is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Retrievability

$$R(t) = e^{-t/S}$$

$R$ = probability you can solve the problem today. $t$ = days since last review. $S$ = stability (days until R decays to ~37%).

### Stability Update

$$S_{\text{new}} = S_{\text{old}} \times \text{multiplier} \times \text{modifier}$$

**Multipliers** (by outcome × quality):

| Outcome    | Optimal | Suboptimal | Brute Force | No Solution |
| ---------- | :-----: | :--------: | :---------: | :---------: |
| Solved     |  2.5×   |    2.0×    |    1.5×     |      —      |
| Partial    |  1.1× (quality ignored across all columns)  |    |     |      —      |
| Not solved |    —    |     —      |    0.8×     |    0.5×     |

**Modifiers** (independent solves only): rewrote from scratch (+0.5), fast solve on Mediums < 10 min (+0.2). **Confidence** (all attempts): level 5 (+0.3), level 4 (+0.1), level 2 (−0.2), level 1 (−0.4). Stability clamped to [0.5, 365] days.

Partial + confidence ≤ 2 forces next review in 1 day. "Could not solve" is due immediately.

### Readiness Score

Weighted composite (0–100):

| Component        | Weight | Measures                                         |
| ---------------- | :----: | ------------------------------------------------ |
| Coverage         |  30%   | % of 150 curated problems attempted               |
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
6. Problems "graduate" to mastered (stability ≥ 45d), freeing capacity

Note: at any given moment, your review queue will be **smaller** than your total attempted problems — that is the SRS working correctly. Each problem has a scheduled review date; only problems whose date has passed appear in the queue. If you have 30 problems in active learning, typically 5–15 are due on a given day.

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
git clone https://github.com/CadenceElaina/aurora.git
cd aurora
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

Run the test suite (52 SRS unit tests, no DB required):

```bash
npm test
```

`seed.ts` inserts the 150 problem rows only — no user data. Fresh installs start with a clean slate.

### Regenerate Problem Data (optional)

```bash
python scripts/fetch_problems.py
```

Downloads metadata from [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode) (MIT). No scraping, no API keys.

---

## Deployment

### Vercel (Recommended)

1. Push the repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in **Settings → Environment Variables**:

   | Variable             | Value                                                            |
   | -------------------- | ---------------------------------------------------------------- |
   | `DATABASE_URL`       | Supabase connection string (Project Settings → Database → URI)   |
   | `AUTH_SECRET`        | Run `npx auth secret` locally and paste the **value only**       |
   | `AUTH_GITHUB_ID`     | GitHub OAuth App Client ID                                       |
   | `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret (**value only**, not `KEY=value`) |

4. Update your GitHub OAuth App's **Authorization callback URL** to:
   ```
   https://your-app.vercel.app/api/auth/callback/github
   ```
5. Deploy — Vercel auto-deploys on push to `main`

> **Important:** When pasting env vars in Vercel, paste only the **value** (e.g., `abc123`), not the full line from `.env.local` (e.g., `AUTH_SECRET=abc123`). Vercel does not strip prefixes.

### Supabase Database Setup

After creating a Supabase project, push the schema and seed:

```bash
npx drizzle-kit push
npx tsx scripts/seed.ts
```

If Supabase's Row Level Security (RLS) blocks Auth.js operations, run in the Supabase SQL Editor:

```sql
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "user" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "account" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "session" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "verification_token" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "verification_token" FOR ALL USING (true) WITH CHECK (true);
```

---

## GitHub Sync (Optional)

Auto-detect when you solve problems on NeetCode and surface them for confirmation on your dashboard.

**Prerequisites:** NeetCode's GitHub integration must be connected. Go to [neetcode.io/profile/github](https://neetcode.io/profile/github) and connect your GitHub account. NeetCode will create a submissions repo (e.g., `your-username/neetcode-submissions-xxxxx`).

**Setup:**

1. Open your Aurora dashboard → look for the GitHub sync icon in the nav bar
2. Click **Set up** and enter your NeetCode submissions repo name (e.g., `your-username/neetcode-submissions-xxxxx`)
3. Click **Connect** — you'll receive a webhook URL and secret
4. Go to your GitHub repo → **Settings** → **Webhooks** → **Add webhook**
   - **Payload URL:** paste the webhook URL from step 3
   - **Content type:** ⚠️ **Change this to `application/json`** (GitHub defaults to `x-www-form-urlencoded` — the webhook will not work without changing this)
   - **Secret:** paste the secret from step 3
   - **Events:** select "Just the push event"
   - Keep SSL verification enabled (default)
5. Click **Add webhook**

To **disconnect**, click "Disconnect" on the GitHub sync banner in your dashboard.

From now on, every NeetCode submission will appear as a pending item on your dashboard. You can:

- **Quick confirm** — one click, uses sensible defaults (Solved independently, optimal quality, confidence 3)
- **Full form** — opens the detailed attempt form for precise logging
- **Dismiss** — skip without recording

Only submissions **after** connecting are detected. Historical submissions are not imported (by design — see [decision record](docs/decisions/2026-04-02-github-webhook-sync.md)).

---

## Project Structure

```
problems.json                  # 150 problems with metadata + complexity
docs/
  ARCHITECTURE.md              # Data model, algorithm, system design
  decisions/                   # Architecture Decision Records (ADRs)
  archived/                    # Superseded design docs
scripts/
  fetch_problems.py            # Data pipeline
  seed.ts                      # Seeds problem metadata into Postgres
tests/
  unit/srs.test.ts             # SRS engine unit tests (52 cases)
src/
  lib/srs.ts                   # Core SRS engine (stability, retrievability, readiness)
  db/schema.ts                 # Drizzle schema
  app/
    dashboard/                 # Dashboard (queue, stats, readiness, mock interview)
    problems/                  # Problem list, detail, attempt form
    api/attempts/              # Attempt logging + SRS update
    api/notes/                 # Per-user problem notes
    api/review/                # Review queue + skip endpoint
    api/pending/               # Pending GitHub submissions
    api/github-sync/           # GitHub repo connection settings
    api/webhook/github/        # GitHub push webhook receiver
```

---

## Troubleshooting

### `CallbackRouteError` or `error=Configuration` after deploying

1. **Check env vars in Vercel** — go to Settings → Environment Variables and verify all four are set (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`). **Ensure you pasted only the value**, not the `KEY=value` line.
2. **Verify GitHub OAuth callback URL** — must match your deployed domain exactly: `https://your-app.vercel.app/api/auth/callback/github`
3. **Redeploy after changing env vars** — Vercel doesn't apply env var changes to existing deployments. Trigger a redeploy from the Deployments tab.

### `incorrect_client_credentials` in Vercel logs

Your `AUTH_GITHUB_ID` or `AUTH_GITHUB_SECRET` doesn't match what GitHub has. Verify the Client ID on your [GitHub OAuth App page](https://github.com/settings/developers). If the secret was lost, generate a new one and update Vercel.

### `unexpected "iss" (issuer) response parameter value`

The GitHub provider needs an explicit `issuer` override for `oauth4webapi` v3 compatibility. This is already configured in `src/auth.ts`. If you see this error, ensure you're on the latest commit.

### RLS (Row Level Security) blocking sign-in

Supabase enables RLS by default on new tables. Auth.js needs write access to `user`, `account`, `session`, and `verification_token`. See [Supabase Database Setup](#supabase-database-setup) for the required SQL.

### `drizzle-kit push` crashes on check constraints

Known Drizzle Kit issue. Use `npx drizzle-kit generate` to create the migration SQL, then run it manually in the Supabase SQL Editor.

---

## Contributing

Contributions welcome. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design and [docs/decisions/](docs/decisions/) for architecture decision records.

Areas where help is useful: algorithm tuning, complexity verification, UI/UX, mobile responsiveness.

---

## Glossary

| Term                  | Definition                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Spaced Repetition** | A learning technique where reviews are scheduled at increasing intervals. Each successful review pushes the next one further out. |
| **FSRS**              | Free Spaced Repetition Scheduler — an open-source algorithm by Jarrett Ye. Aurora uses a modified multi-signal version.      |
| **Stability**         | How durable your memory of a problem is, in days. Higher = slower forgetting = longer review intervals.                           |
| **Retrievability**    | Estimated probability (0–100%) you could solve a problem right now. Decays exponentially since last review. Floored at 30%.       |
| **Forgetting Curve**  | The graph of retrievability over time (exponential decay). First measured by Ebbinghaus in 1885.                                  |
| **NeetCode 150**      | A curated list of 150 LeetCode problems covering all major interview topics, organized by category.                               |
| **Blind 75**          | A subset of 75 most frequently asked coding interview problems. Given a small priority bonus in the review queue.                 |
| **Readiness Score**   | A 0–100 composite of coverage (30%), retention (40%), category balance (20%), and consistency (10%). Maps to tiers S through D.   |

For a detailed walkthrough with examples, see the [How It Works](/info) page in the app.

---

## License

MIT

## Acknowledgments

- [NeetCode](https://neetcode.io) — curated problem lists and category structure
- [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode) — open-source problem metadata (MIT)
- [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) by Jarrett Ye — spaced repetition research foundation
