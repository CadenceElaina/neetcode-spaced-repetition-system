# Iteration Process — Aurora

Read this at the start of every work session. Then read CURRENT.md.

---

## The Loop

```
SYNC → READ STATE → INSPECT → CATEGORIZE → PRIORITIZE → CHANGE → VERIFY → COMMIT → UPDATE DOCS → PUSH
```

---

## Step 1 — Sync

```bash
cd /home/cadenceanderson/dev/aurora
git pull
```

Check for any concurrent remote changes before touching anything.

---

## Step 2 — Read State

Always read in this order:

1. `docs/CURRENT.md` — bugs, in-progress, next candidates
2. `hidden-docs/LLM_CONTEXT.md` — architecture rules, pitfalls, design concerns
3. `CLAUDE.md` — stack, commands, interaction rules

**Only if the task touches those areas:**
- `docs/ARCHITECTURE.md` — algorithm math, data model
- `src/lib/srs.ts` — SRS engine (read before any algorithm change)
- `src/db/schema.ts` — data model (read before any DB query change)

---

## Step 3 — Browser Checklist

Open https://aurora-ascent.vercel.app (or `npm run dev` → localhost:3000) and check:

**Core flows:**
- [ ] Sign in works (GitHub OAuth)
- [ ] Dashboard loads with correct review queue count
- [ ] Log attempt modal opens, submits, SRS banner appears after submit
- [ ] Review queue items show correct overdue badges
- [ ] Mock interview: produces exactly 2 problems (1 medium + 1 hard)
- [ ] Import tab: paste NeetCode activity, problems appear
- [ ] GitHub sync: connection flow completes without error

**Readiness / Algorithm:**
- [ ] Readiness score updates after logging an attempt
- [ ] Review tab shows problems with correct `daysOverdue`
- [ ] Practice recommendation topbar shows appropriate tone for current state
- [ ] Queue Forecast chart renders and matches expected shape

**UX / Visual:**
- [ ] Landing page: no cat ASCII face, no ":3" messages (when removed)
- [ ] Footer: no "powered by cats" (when removed)
- [ ] Pink color not used as primary UI element — gradient/hover only
- [ ] New user cold start: defaults to New tab, no confusing empty state
- [ ] Dark mode renders correctly — no raw hex colors, only theme tokens

**Build:**
- [ ] `npm test` — 52/52 passing (update count when tests are added)
- [ ] `npm run build` — no TypeScript errors, no lint errors

---

## Step 4 — Categorize Findings

| Category | Definition |
|---|---|
| **Bug** | Wrong behavior — incorrect SRS calculation, broken flow, TS error |
| **UX Debt** | Works but confusing — empty states, confusing copy, layout issues |
| **Feature** | New capability |
| **Polish** | Correct but not presentable — visual roughness, copy quality |

---

## Step 5 — Prioritize (max 3–5 changes per session)

Order:
1. Build errors / test failures — always first
2. Bugs that affect correctness (SRS math, data integrity)
3. UX debt that would confuse a professor or new user
4. Polish for the presentation
5. New features

---

## Step 6 — Apply Changes

Rules specific to Aurora's stack:

- **Server vs. client components:** data fetching in server components, mutations through `/api/*` routes, interactive UI in `*-client.tsx`. Never add `"use client"` to a page file.
- **Theme:** always use Tailwind theme tokens (`bg-accent`, `text-muted-foreground`). Never raw hex.
- **Auth:** always check `session?.user?.id` before any DB operation. Never assume `auth()` returns a valid session.
- **SRS multipliers:** if you change any multiplier in `src/lib/srs.ts`, update `docs/ARCHITECTURE.md` AND `README.md` to match. All three must stay in sync.
- **DB migrations:** use `npx drizzle-kit push` (not generate + migrate). Test on local DB before pushing to Supabase.

---

## Step 7 — Verify

```bash
npm test        # SRS unit tests must pass
npm run build   # No TS errors
```

Then reload the browser and re-check the affected checklist items.

---

## Step 8 — Commit and Push

```bash
git add -A
git commit -m "<type>(<scope>): <short description>"
git pull --rebase   # catch concurrent remote changes
git push
```

Commit types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

Subject line under 72 characters. One logical change per commit.

---

## Step 9 — Update Docs

After every session:
1. Update `docs/CURRENT.md`:
   - Change the "Last updated" line
   - Move completed items to Recently Completed
   - Update Known Bugs
   - Reprioritize Next Iteration Candidates
   - Update test count if it changed

---

## Stability Rules (Never Violate)

1. **SRS multipliers are documented in three places** — `srs.ts`, `ARCHITECTURE.md`, `README.md`. All must stay in sync.
2. **Never assume auth() returns a valid session** — always check `session?.user?.id`
3. **Never import `@/db` in a component that should work without a database** — use dynamic import + try/catch + fallback
4. **Tests must pass before any commit** — `npm test` is not optional
5. **Never hardcode colors** — always use theme tokens
6. **Demo mode must keep working** — never break the unauthenticated path
