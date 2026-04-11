# Feature Roadmap — April 2026

> Decisions made via planning session 2026-04-11. Target: Fall 2026 recruiting.

---

## Context

Aurora currently does one thing well: spaced repetition for 150 curated LeetCode problems. This roadmap expands it into a broader interview prep platform — while keeping the core focused on intern/new-grad SWE first, with room to add role tracks later.

**Guiding principles:**

- Free, open-source tool for CS students
- Everything must be grounded in learning science (spaced repetition, active recall, interleaving, desirable difficulty)
- The app itself is a portfolio piece — code quality, UI/UX, and engineering decisions matter
- Start narrow (intern/new-grad SWE), expand to other roles later
- Light science references in the UI, deep detail in docs

---

## 1. Landing Page (Non-Authenticated Home)

### Current State

`/` redirects all visitors to `/dashboard`, which shows a sign-in prompt. No marketing, no preview.

### Design

**Hero section (above the fold):**

- Tagline + value proposition (e.g., "Stop re-solving problems you already know")
- Brief feature highlights (3–4 bullet points or cards)
- Sign-in CTA (GitHub OAuth)
- Visual: animated skill tree preview or screenshot

**Functional preview (below the fold):**

- Read-only skill tree / galaxy map showing the NeetCode 150 topology
- Problem list browsable without sign-in
- Stats page viewable without sign-in (shows demo data or empty state)
- Sign-in prompt appears when user tries to log an attempt, save notes, etc.

**Auth model:** Full access without sign-in. Data is not persisted without an account. This lets visitors explore the tool before committing.

### Implementation

- Convert `src/app/page.tsx` from redirect to a landing page component
- Nav shows "Sign in" button when no session (instead of sign-out)
- Conditionally render nav links — authenticated users see full nav, visitors see limited nav
- Landing page is a client component for the 3D tilt interactive elements

### Inspiration

NeetCode's landing page (clean, dark, shows the roadmap visually) — but our identity is different:

| NeetCode                 | Aurora                                      |
| ------------------------ | ------------------------------------------- |
| Video courses + practice | Retention tracking + intelligent scheduling |
| "Learn these problems"   | "Never forget what you've learned"          |
| Content platform         | Study system                                |
| Roadmap → solve          | Solve → track → review → master             |

Our landing page should communicate the _system_ — not just a problem list.

---

## 2. Skill Tree / Galaxy Map

### Concept

A radial/constellation-style interactive visualization of the NeetCode 150 (starting with Blind 75 or NeetCode 150 subset). Problems are nodes, organized by category, connected by conceptual prerequisites.

### Visual Design

- **Layout:** Radial from center outward. Core concepts (Arrays & Hashing) at center, advanced topics (Dynamic Programming, Graphs) at the edges.
- **Nodes:** Each problem is a dot/node. Color indicates mastery state (new / learning / mastered / decaying).
- **Connections:** Lines between problems that share prerequisite concepts (e.g., Two Sum → Two Sum II → 3Sum).
- **Categories:** Clusters/constellations per category. Category label at cluster center.
- **Fog of war:** Unvisited areas are dimmed/blurred. As user completes problems, adjacent nodes "reveal." Toggle button (bottom-right, moves with content) to show full map.

### 3D Tilt Effect

Explore each option during implementation:

1. **Whole tree tilts** — subtle parallax on the entire canvas
2. **Individual nodes tilt** — card-style tilt on hover per problem node
3. **Layered** — combine both

Start with individual node tilt (simpler, clearest visual feedback), then experiment.

**Tech approach:**

- Canvas: HTML/CSS with absolute positioning, or SVG, or `<canvas>` (evaluate during implementation)
- Tilt: Vanilla JS mouse tracking (no heavy dependencies). Map mouse position relative to element center → `rotateX` / `rotateY`. Reset on mouse leave. Smooth with CSS `transition`.
- Consider Framer Motion for React integration if vanilla approach feels jittery

### Data Model Extension

Need a `problemPrerequisites` join table or a `prerequisites` JSON column on `problems`:

```
Problem A (Two Sum) → Problem B (Two Sum II) → Problem C (3Sum)
```

This drives:

- Connection lines in the visualization
- Fog-of-war reveal logic
- Suggested solve order

### Implementation Phases

1. **Phase 1:** Static radial layout with category clusters. No connections, no fog. Just a visual map.
2. **Phase 2:** Add prerequisite connections (lines between nodes). Define prerequisite data.
3. **Phase 3:** Fog of war + reveal animation.
4. **Phase 4:** 3D tilt effect experiments.

---

## 3. Gamification (Medium Depth)

### XP System

**Sources:**

| Action                                         | XP                             |
| ---------------------------------------------- | ------------------------------ |
| Complete an attempt (Easy)                     | 10                             |
| Complete an attempt (Medium)                   | 20                             |
| Complete an attempt (Hard)                     | 30                             |
| Solved independently + optimal                 | 2× bonus                       |
| Daily login                                    | 5                              |
| Streak day (consecutive days with ≥ 1 attempt) | +2 per streak day (capped)     |
| Flashcard review session                       | 5 per session                  |
| Complete a guided exercise                     | 15–50 (scales with complexity) |

**Levels:** XP thresholds map to levels. Levels are visible on profile. No gameplay effect — purely motivational.

### Streaks

Already partially tracked (dashboard shows "0 streak"). Formalize:

- Streak = consecutive calendar days with ≥ 1 logged attempt
- Streak freeze: user can "freeze" 1 day per week to preserve streak (prevents anxiety-driven low-quality attempts)
- Visual: fire emoji + count (already in place)

### Badges / Achievements

| Badge          | Condition                                    |
| -------------- | -------------------------------------------- |
| First Blood    | Log first attempt                            |
| Category Clear | Complete all problems in a category          |
| Blind 75       | Complete all Blind 75 problems               |
| Week Warrior   | 7-day streak                                 |
| Month Master   | 30-day streak                                |
| Retention King | 80%+ retention across all attempted problems |
| Speed Demon    | Solve a Medium in < 5 minutes                |
| Full Coverage  | Attempt all 150 problems                     |
| Tier S         | Reach S tier readiness                       |

### Daily Quests

Small, rotating objectives that give bonus XP:

- "Review 3 problems today"
- "Attempt 1 Hard problem"
- "Complete a flashcard session"
- "Improve retention in your weakest category"

### What We're NOT Doing

- No leaderboards (yet) — avoids toxic competition, keeps focus on personal growth
- No paid items — everything is free
- No social features (yet) — solo study tool first
- No character/avatar system — keep it clean and professional

### Data Model

New tables:

```
UserXP: userId, totalXP, level, updatedAt
UserBadge: userId, badgeId, earnedAt
UserStreak: userId, currentStreak, longestStreak, lastActiveDate, freezesUsed
DailyQuest: userId, questType, target, progress, date, completed
```

---

## 4. Flashcards

### Scope

Three types, all using spaced repetition scheduling:

**a) Concept flashcards**

- Front: "What is a sliding window?"
- Back: Definition + when to use it + time/space complexity characteristics
- Source: curated per category, aligned with NeetCode 150 topics

**b) Pattern recognition**

- Front: Problem description (simplified)
- Back: Which pattern/technique to use + why
- Trains the hardest interview skill: "what approach do I even use?"

**c) Code flashcards**

- Front: Function signature + description
- Back: Implementation (reveal on flip)
- User writes their version, then compares

### Scheduling

Reuse the existing SRS engine (`srs.ts`). Each flashcard is a "reviewable item" with its own stability and retrievability. Same algorithm, different content type.

### Data Model

```
Flashcard: id, type (concept/pattern/code), category, front, back, difficulty
UserFlashcardState: userId, flashcardId, stability, nextReviewAt, totalReviews
```

### Content Pipeline

- Concept cards: manually curated (start with 10–15 per category)
- Pattern cards: derived from problem metadata + manual tagging
- Code cards: can auto-generate from problem solutions (stretch goal)

### Implementation Priority

Plan now, build after landing page and skill tree. Flashcards are self-contained — they don't block other features.

---

## 5. Guided Exercises (Plan Only — Build Later)

### Concept

Structured skill-building exercises that go beyond "solve this LeetCode problem." The idea:

1. **Identify skills** — what does a SWE intern need to demonstrate?
2. **Map skills to exercises** — increasing complexity per skill
3. **Read → Practice → Demonstrate → Progress** flow

### Skill Categories (Intern/New-Grad SWE)

| Skill Area              | Examples                                                               |
| ----------------------- | ---------------------------------------------------------------------- |
| Data Structures         | Arrays, hash maps, linked lists, trees, graphs, heaps, stacks, queues  |
| Algorithms              | Sorting, searching, BFS/DFS, dynamic programming, greedy, backtracking |
| Problem-Solving Process | Understand → plan → code → test → optimize                             |
| Complexity Analysis     | Identify time/space complexity of code snippets                        |
| Code Quality            | Clean code, variable naming, edge case handling                        |
| System Design (intro)   | Basic concepts: APIs, databases, caching (light, for intern level)     |
| Behavioral              | STAR method, project descriptions (out of scope for MVP)               |

### Exercise Structure (per skill)

```
Level 1: READ    — Concept explanation + examples + resources
Level 2: PRACTICE — Guided walkthrough (fill-in-the-blank, reorder steps)
Level 3: DEMONSTRATE — Solve a problem using the skill, no hints
Level 4: MASTER  — Explain the concept back (teach-back method) + solve variants
```

### Learning Science Foundation

| Principle                     | How We Apply It                                                      |
| ----------------------------- | -------------------------------------------------------------------- |
| **Spaced repetition**         | Review skills at increasing intervals (already built)                |
| **Active recall**             | Flashcards, exercises that require production (not recognition)      |
| **Interleaving**              | Mix problem types in review sessions (already done via review queue) |
| **Desirable difficulty**      | Fog of war hides easy paths; exercises scale in complexity           |
| **Elaborative interrogation** | "Why does this approach work?" prompts in exercises                  |
| **Retrieval practice**        | Code flashcards — write before seeing the answer                     |
| **The testing effect**        | Frequent low-stakes quizzes (daily quests, flashcard sessions)       |
| **Metacognition**             | Confidence ratings, self-assessment after attempts                   |
| **Concrete examples**         | Every concept has 2–3 worked examples before practice                |
| **Dual coding**               | Visual (skill tree, diagrams) + verbal (explanations, flashcards)    |

### Pros

- Differentiates from every other LeetCode tracker
- Creates a complete learning path (not just "here's 150 problems, go")
- Gamification integrates naturally (XP per exercise level)
- Teaches _how to approach_ problems, not just _which problems to solve_
- Portfolio-impressive: shows understanding of learning science + product design

### Cons

- Massive content creation effort (each skill × 4 levels × examples)
- Need domain experts to verify accuracy of resources
- Risk of scope creep — could become an entire course platform
- Hard to keep resources up-to-date
- Authoring tool needed for non-technical contributors (future)

### Mitigation

- Start with 3 skills only (e.g., Two Pointers, Sliding Window, Hash Maps)
- Use existing open-source resources (link out, don't recreate)
- Community contributions (stretch goal)
- Keep exercises short (5–15 minutes each)

---

## 6. Implementation Phases

### Phase 1: Foundation (Now → 2 weeks)

- [x] Fix stale docs
- [x] Add sign-out button
- [ ] Landing page (hero + feature highlights + sign-in CTA)
- [ ] Auth-aware nav (show sign-in vs. sign-out, adjust visible links)
- [ ] Auth-aware routing (pages accessible without sign-in, mutations require auth)

### Phase 2: Visual Identity (2–4 weeks)

- [ ] Skill tree data model (problem prerequisites)
- [ ] Static radial/galaxy layout component
- [ ] 3D tilt effect (experiment with vanilla JS first)
- [ ] Fog of war toggle
- [ ] Landing page functional preview (read-only skill tree)

### Phase 3: Gamification (4–6 weeks)

- [ ] XP system (data model + earn logic + display)
- [ ] Streak formalization (streak freeze, visual)
- [ ] Badges / achievements (data model + earn triggers + badge display)
- [ ] Daily quests (data model + generation + tracking)

### Phase 4: Flashcards (6–8 weeks)

- [ ] Flashcard data model + seed initial content
- [ ] Flashcard review UI (flip card, self-grade)
- [ ] SRS integration for flashcard scheduling
- [ ] Three card types (concept, pattern, code)

### Phase 5: Guided Exercises (8–12 weeks)

- [ ] Skill taxonomy definition
- [ ] Exercise framework (read/practice/demonstrate/master levels)
- [ ] First 3 skills implemented
- [ ] Progress tracking per skill

### Phase 6: Polish + Portfolio (12+ weeks)

- [ ] Performance optimization
- [ ] Mobile responsiveness pass
- [ ] README + docs update for portfolio presentation
- [ ] Demo video / walkthrough
- [ ] Deploy to custom domain

---

## 7. Open Questions

1. **Prerequisite data**: Where does the problem dependency graph come from? Manual curation? Community consensus? NeetCode's own ordering?
2. **Galaxy map rendering**: HTML+CSS vs. SVG vs. Canvas vs. WebGL? Need to prototype to decide.
3. **Flashcard content**: Who writes the initial flashcard set? Manual first, then community?
4. **Role tracks**: When we expand beyond intern/new-grad, how do skill trees fork? Separate trees or shared core + branches?
5. **Offline support**: Should flashcards work offline (PWA)?
6. **Analytics**: Track which exercises/flashcards are most effective at improving retention?
