# LLM Agent Context — Aurora

> This document is the single source of truth for any AI/LLM coding agent working on this project. Read this FIRST before making any changes.

---

## Project Summary

**Aurora** is a self-hosted spaced repetition system for 150 curated LeetCode problems. It tracks what you've solved, computes when you'll forget it, and schedules reviews. It's a free, open-source portfolio piece targeting CS students preparing for SWE internship/new-grad interviews.

**Live deployment:** Vercel (owner's instance). Users fork the repo and self-host with their own Supabase + GitHub OAuth.

---

## Tech Stack

| Layer      | Technology            | Version / Notes                            |
| ---------- | --------------------- | ------------------------------------------ |
| Framework  | Next.js (App Router)  | 16.x, Turbopack build                      |
| Language   | TypeScript            | Strict mode                                |
| Styling    | Tailwind CSS 4        | `@theme inline` for CSS custom properties  |
| Database   | PostgreSQL            | Hosted on Supabase                         |
| ORM        | Drizzle ORM           | Push-based migrations (`drizzle-kit push`) |
| Auth       | NextAuth v5 (Auth.js) | GitHub OAuth only                          |
| Deployment | Vercel                | Free tier compatible                       |

---

## Project Structure

```
src/
  auth.ts              # NextAuth config — conditionally initializes (see Auth section)
  app/
    globals.css        # Theme system (CSS custom properties, light/dark)
    layout.tsx         # Root layout — passes isAuthenticated + authConfigured to Nav
    page.tsx           # Landing page (server component → LandingPage client component)
    landing-client.tsx # Landing page with 3D tilt constellation map
    dashboard/         # User's main view — SRS stats, review queue, activity
    problems/          # Problem list + individual problem + attempt form
    drill/             # Category-focused practice mode
    mock-interview/    # Timed interview simulation
    review/            # Review queue (due items)
    stats/             # Charts and analytics
    activity/          # Daily/weekly attempt history
    import/            # Bulk import from external sources
    info/              # How the SRS algorithm works (public, no auth needed)
    auth/error/        # Auth error page — doubles as setup guide
    api/               # All mutations go through API routes
  components/
    nav.tsx            # Top nav bar — auth-aware, theme-aware
    theme.tsx          # ThemeProvider + ThemeToggle (light/dark, localStorage)
    difficulty-badge.tsx
    log-attempt-modal.tsx
    problem-notes.tsx
    delete-attempt-button.tsx
    video-embed.tsx
  db/
    index.ts           # Drizzle client (requires DATABASE_URL)
    schema.ts          # Full schema (users, accounts, sessions, problems, attempts, userProblemStates, pendingSubmissions)
  lib/
    srs.ts             # Core SRS engine — stability, retrievability, scheduling
scripts/
  seed.ts              # Seeds problems table from problems.json
  fetch_problems.py    # Fetches problem data from neetcode-gh/leetcode repo
  check_neetcode_links.py
docs/
  ARCHITECTURE.md      # Data model, algorithm details, system design
  DESIGN_SYSTEM.md     # (Exists but may be stale — check globals.css as source of truth)
  decisions/           # ADRs and planning docs
problems.json          # Static problem data (150 problems, 18 categories) — used as fallback
```

---

## Critical Architecture Decisions

### 1. Auth is conditionally initialized (DO NOT BREAK THIS)

`src/auth.ts` exports `isAuthConfigured` (boolean) and conditionally calls `NextAuth()`. When `AUTH_SECRET`, `AUTH_GITHUB_ID`, or `AUTH_GITHUB_SECRET` are missing, it exports safe no-op functions (`auth()` returns `null`, handlers redirect to setup guide).

**Why:** The app must work without any `.env` file. Landing page, problems list, info page, and the setup guide all work without auth. Every page that imports `{ auth } from "@/auth"` already has a "sign in to use this" fallback UI — the no-op auth triggers those paths naturally.

**Rules:**

- NEVER call `NextAuth()` unconditionally at module level
- NEVER assume `auth()` returns a valid session — always check `session?.user?.id`
- Pages that need auth should have an `if (!session?.user?.id)` early return with a sign-in prompt
- The `isAuthConfigured` boolean is passed to Nav and LandingPage to show appropriate UI (setup guide link vs sign-in button)

### 2. DB module crashes without DATABASE_URL

`src/db/index.ts` uses `process.env.DATABASE_URL!` (non-null assertion). If DATABASE_URL is missing, importing `@/db` throws at module level.

**Current workaround:** `page.tsx` (landing) uses dynamic imports with try/catch and falls back to `problems.json`. Other pages import `@/db` statically — they'll crash without a DB, which is acceptable since they need the DB to function anyway.

**Rule:** If you add a new page that should work without a DB, use the same dynamic import + fallback pattern as `page.tsx`.

### 3. Server Components for data, Client Components for interaction

All pages are Server Components that fetch data and pass it as props to Client Components. API routes (`/api/*`) handle all mutations. No client-side data fetching except for the GitHub sync dropdown.

### 4. SRS Algorithm

The core algorithm lives in `src/lib/srs.ts`. Key functions:

- `computeRetrievability(stability, daysSince)` — forgetting curve, returns 0.0–1.0
- `computeReadiness(retrievability)` — maps to letter grades (S, A, B, C, D)
- `computeNewStability(...)` — FSRS-inspired stability update after an attempt

**Multiplier rules (verified against code):**

- Solved independently: YES=2.5×, PARTIAL=1.1×, NO=0.5×
- Solution quality: OPTIMAL=1.4×, SUBOPTIMAL=1.0×, BRUTE_FORCE=0.7×, NONE=0.4×
- Speed: fast solve (Medium only) = 1.1×, fast study = 1.0× (no bonus)
- Confidence: 5→1.2×, 4→1.1×, 3→1.0×, 2→0.9×, 1→0.8×

DO NOT modify these multipliers without updating ARCHITECTURE.md and README.md (they were previously out of sync and we fixed them).

---

## Theme System

### How it works

CSS custom properties in `globals.css` → mapped to Tailwind via `@theme inline` → used in components via Tailwind classes (`bg-accent`, `text-muted-foreground`, etc.).

Light/dark toggle in `ThemeProvider` (localStorage + class on `<html>`).

### Current palette

**Light:** Lavender base (#faf8ff), purple accent (#a855f7), pink secondary (#ec4899)
**Dark:** Deep space (#0c0a14), soft purple accent (#c084fc), pink (#f472b6)

### DESIGN CONCERN — READ THIS

The current theme leans heavily into purple/pink ("Nebula Femme" was the working name). The owner wants to **pull back** the aesthetic to be more universally professional while retaining subtle fem energy. Specific concerns:

1. **The landing page cat ASCII face and ":3" messages need to be removed or made opt-in.** These are too casual/childish for a public-facing SWE tool.
2. **The pink secondary color (`--accent-secondary`) is too prominent.** Consider making it more subtle — used only for hover states, gradients, or data visualization accents, NOT as a primary UI color.
3. **"powered by cats 🐱" in the footer needs to go** for the default/public theme.
4. **The glow effects (`.glow-node`) are fine** — they read as "tech/space" not "girly."
5. **The purple accent is fine** — purple is used by many professional tools (Stripe, Twitch, GitHub's dark mode).
6. **The starfield background is fine** — subtle, contextual to the constellation map.

**Future plan:** Implement a theme system where users can pick from presets (Default/Professional, Nebula, etc.) and the owner can have a personal "Cosmic Cat" theme without it being the default. For now, the default should be **clean, professional purple with minimal pink**.

**Actionable changes needed:**

- Remove `CatGreeting` component from landing page (or hide behind a feature flag)
- Change footer to just "free & open source" (no cats reference)
- Make `--accent-secondary` usage more restrained — gradient text is fine, but don't use pink for UI elements
- Consider changing landing page gradient text to mono-accent (just purple) instead of purple→pink

### Theme tokens reference

```css
--background, --foreground          /* Base colors */
--muted, --muted-foreground         /* Secondary text, card backgrounds */
--border                            /* Borders */
--ring                              /* Focus outlines */
--accent, --accent-foreground       /* Primary action color (purple) */
--accent-secondary                  /* Pink — USE SPARINGLY (see above) */
--destructive                       /* Errors, danger actions */
--success, --warning                /* Status colors */
--glow, --glow-pink                 /* Box-shadow glow effects */
```

---

## Landing Page Architecture

**File:** `src/app/landing-client.tsx`

Single-viewport layout (no scroll), split view:

- **Left:** Hero text, CTA buttons, stats row, 2×2 feature cards
- **Right:** Interactive constellation map (radial layout of 18 NeetCode categories)

**3D tilt system:**

- `useTilt(maxDeg)` — per-element tilt on mouse hover (category nodes, feature cards)
- `useContainerTilt(maxDeg)` — whole constellation map tilts with mouse position
- CSS `perspective()` + `rotateX/rotateY` + `transition` for smooth animation

**Three user states** (determined server-side in `page.tsx`):

1. **Auth not configured** — CTA says "Browse Problems" (links to `/problems`)
2. **Signed out, auth available** — CTA says "Get started — free" (links to sign-in)
3. **Signed in** — CTA says "Go to Dashboard"

---

## Pages That Work Without Auth/DB

| Page              | Works without auth?                 | Works without DB?                 |
| ----------------- | ----------------------------------- | --------------------------------- |
| `/` (landing)     | Yes                                 | Yes (falls back to problems.json) |
| `/info`           | Yes                                 | Yes (static content)              |
| `/auth/error`     | Yes                                 | Yes (setup guide)                 |
| `/problems`       | Yes (shows list, no retention data) | No (needs DB for problem list)    |
| `/dashboard`      | Shows sign-in prompt                | No                                |
| `/drill`          | Shows sign-in prompt                | No                                |
| `/mock-interview` | Shows sign-in prompt                | No                                |
| `/review`         | Shows sign-in prompt                | No                                |
| `/stats`          | Shows sign-in prompt                | No                                |
| `/activity`       | Shows sign-in prompt                | No                                |
| `/import`         | Redirects to `/`                    | No                                |

---

## Key Files to Read Before Making Changes

1. **`src/auth.ts`** — Understand the conditional init pattern before touching auth
2. **`src/app/globals.css`** — Source of truth for theme (not DESIGN_SYSTEM.md)
3. **`src/lib/srs.ts`** — Core algorithm, heavily tested against real usage
4. **`src/db/schema.ts`** — Full data model
5. **`docs/ARCHITECTURE.md`** — Algorithm tables, data model docs
6. **`docs/decisions/2026-04-11-feature-roadmap.md`** — Feature plans (galaxy map, gamification, flashcards)

---

## Common Pitfalls

1. **Don't add `"use client"` to server component pages.** Data fetching happens in server components. Only the interactive sub-component should be a client component.
2. **Don't import `@/db` in components that should work without a database.** Use dynamic import + try/catch + fallback.
3. **Don't hardcode colors.** Always use theme tokens (`bg-accent`, `text-muted-foreground`, `border-border`). Never use raw hex values in components.
4. **Don't modify SRS multipliers** without updating the three places they're documented (srs.ts, ARCHITECTURE.md, README.md).
5. **Tailwind CSS 4 uses `@theme inline`**, not the old `tailwind.config.js` approach. The theme mapping is in `globals.css`.
6. **The `problems.json` file is the static fallback.** Don't delete it. It's also used for the landing page when no DB is available.
7. **NextAuth v5 + oauth4webapi v3** requires the `issuer` field on the GitHub provider config. Don't remove it.
8. **`drizzle-kit push`** is used for migrations, not `drizzle-kit generate` + `drizzle-kit migrate`. The project uses push-based schema sync.

---

## What's In Progress / Planned

From the feature roadmap (`docs/decisions/2026-04-11-feature-roadmap.md`):

- **Phase 1:** Landing page polish (current — tone down aesthetic, make professional)
- **Phase 2:** Theme presets system (user can pick from Default, Nebula, etc.)
- **Phase 3:** Gamification (XP, streaks, badges, daily quests — medium intensity)
- **Phase 4:** Flashcards (concept + pattern + code cards with SRS scheduling)
- **Phase 5:** Guided exercises (step-by-step walkthroughs)
- **Phase 6:** Galaxy map expansion (fog of war, prerequisite connections, unlock animations)

**Immediate priority:** Make the landing page and overall site presentable for public/SWE community. Remove overly casual elements. Keep the purple identity but dial back pink. Professional first, personality second.
