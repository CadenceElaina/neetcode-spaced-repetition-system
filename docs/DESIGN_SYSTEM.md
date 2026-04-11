# Aurora — Design System

> **Single source of truth for all visual and interaction decisions.**
> Every component, page, and UI element must follow these rules.

---

## 1. Principles

1. **Simple over clever.** No gradients, no shadows for decoration, no rounded-everything. Clean lines, clear hierarchy.
2. **Content-first.** The data (problems, scores, charts) is the UI. Chrome is minimal.
3. **Consistent spacing.** Use the spacing scale. Don't eyeball it.
4. **Two modes, fully committed.** Light and dark themes are equal citizens — not an afterthought bolted on.

---

## 2. Color System

All colors use CSS custom properties for theme switching. Tailwind classes reference these via the theme config.

### Semantic Tokens

| Token                 | Light     | Dark      | Usage                              |
| --------------------- | --------- | --------- | ---------------------------------- |
| `--background`        | `#fafafa` | `#0a0a0a` | Page background                    |
| `--foreground`        | `#0a0a0a` | `#fafafa` | Primary text                       |
| `--muted`             | `#f4f4f5` | `#18181b` | Subtle backgrounds (cards, inputs) |
| `--muted-foreground`  | `#71717a` | `#a1a1aa` | Secondary text, placeholders       |
| `--border`            | `#e4e4e7` | `#27272a` | Borders, dividers                  |
| `--ring`              | `#18181b` | `#d4d4d8` | Focus rings                        |
| `--accent`            | `#2563eb` | `#3b82f6` | Primary action (links, buttons)    |
| `--accent-foreground` | `#ffffff` | `#ffffff` | Text on accent                     |
| `--destructive`       | `#dc2626` | `#ef4444` | Errors, destructive actions        |
| `--success`           | `#16a34a` | `#22c55e` | Correct answers, positive states   |
| `--warning`           | `#d97706` | `#f59e0b` | Caution, decay warnings            |

### Difficulty Colors

| Difficulty | Color (both themes)   | Usage                      |
| ---------- | --------------------- | -------------------------- |
| Easy       | `#22c55e` (green-500) | Difficulty badges, filters |
| Medium     | `#f59e0b` (amber-500) | Difficulty badges, filters |
| Hard       | `#ef4444` (red-500)   | Difficulty badges, filters |

### Retention Heat Colors

Retention (R value) maps to a 5-step scale:

| Range         | Color       | Label    |
| ------------- | ----------- | -------- |
| R ≥ 0.8       | green-500   | Strong   |
| 0.6 ≤ R < 0.8 | emerald-400 | Good     |
| 0.4 ≤ R < 0.6 | amber-500   | Fading   |
| 0.2 ≤ R < 0.4 | orange-500  | Weak     |
| R < 0.2       | red-500     | Critical |

### Tier Colors

| Tier | Color       | Badge Style |
| ---- | ----------- | ----------- |
| S    | violet-500  | Solid badge |
| A    | blue-500    | Solid badge |
| B    | emerald-500 | Solid badge |
| C    | amber-500   | Solid badge |
| D    | zinc-400    | Solid badge |

---

## 3. Typography

**Font stack:** System fonts only. No custom font loading.

```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Mono (code):** `'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace`

### Scale

| Name          | Size               | Weight              | Usage                          |
| ------------- | ------------------ | ------------------- | ------------------------------ |
| Page title    | text-2xl (1.5rem)  | font-semibold (600) | Page headings (`<h1>`)         |
| Section title | text-lg (1.125rem) | font-semibold (600) | Card headers, section labels   |
| Body          | text-sm (0.875rem) | font-normal (400)   | Default text everywhere        |
| Small         | text-xs (0.75rem)  | font-normal (400)   | Labels, metadata, timestamps   |
| Code          | text-sm (0.875rem) | font-normal (400)   | Code blocks, complexity values |

**Rule:** No `text-base` (1rem) in the main UI. Body is `text-sm`. This keeps the interface dense and information-rich without feeling cramped.

---

## 4. Spacing

Use Tailwind's spacing scale exclusively. No arbitrary values.

| Context                   | Value   | Tailwind               |
| ------------------------- | ------- | ---------------------- |
| Page padding (horizontal) | 1.5rem  | `px-6`                 |
| Page padding (vertical)   | 1.5rem  | `py-6`                 |
| Between sections          | 2rem    | `gap-8` or `space-y-8` |
| Between cards             | 1rem    | `gap-4`                |
| Card internal padding     | 1rem    | `p-4`                  |
| Between form fields       | 0.75rem | `gap-3`                |
| Inline element gap        | 0.5rem  | `gap-2`                |
| Tight inline gap          | 0.25rem | `gap-1`                |

**Max content width:** `max-w-6xl` (72rem). Centered with `mx-auto`.

---

## 5. Components

### Buttons

Two variants only:

| Variant     | Style                                             | Usage                                  |
| ----------- | ------------------------------------------------- | -------------------------------------- |
| **Primary** | `bg-accent text-accent-foreground` + hover darken | Main actions (Submit, Log Attempt)     |
| **Ghost**   | `text-foreground` + hover `bg-muted`              | Secondary actions, navigation, filters |

No outline buttons. No tertiary. No icon-only buttons without a tooltip.

**Size:** All buttons are `h-9 px-4 text-sm rounded-md`. One size.

### Cards

- Background: `bg-muted`
- Border: `border border-border`
- Radius: `rounded-lg`
- Padding: `p-4`
- No shadow. Ever.

### Badges

- Small: `text-xs px-2 py-0.5 rounded-full font-medium`
- Background varies by type (difficulty, tier, retention)
- Text is always white or the badge color on a subtle background

### Inputs / Selects

- Background: `bg-background`
- Border: `border border-border`
- Radius: `rounded-md`
- Height: `h-9`
- Text: `text-sm`
- Focus: `ring-2 ring-ring ring-offset-2`
- Placeholder: `text-muted-foreground`

### Tables

- No outer border
- Header: `text-xs font-medium text-muted-foreground uppercase tracking-wide`
- Rows: `border-b border-border`
- Hover: `hover:bg-muted`
- Cell padding: `px-4 py-3`

### Code Blocks

- Background: `bg-muted`
- Border: `border border-border rounded-lg`
- Font: mono stack
- Padding: `p-4`
- Language label in top-right corner: `text-xs text-muted-foreground`

---

## 6. Layout

### Navigation

- Top navbar, full width
- Left: Logo/wordmark ("Aurora", text, no icon)
- Right: Nav links (Dashboard, Problems, Review, Stats) + user avatar/menu
- Height: `h-14`
- Border bottom: `border-b border-border`
- Background: `bg-background`
- Sticky: `sticky top-0 z-50`

### Page Structure

```
<Nav />
<main className="mx-auto max-w-6xl px-6 py-6">
  <h1>Page Title</h1>
  <content />
</main>
```

No sidebar. No footer (for MVP). Single-column layout with max-width constraint.

### Responsive Breakpoints

- Mobile: default (< 640px) — single column, collapsible nav
- Tablet: `sm:` (640px+) — still single column, more breathing room
- Desktop: `lg:` (1024px+) — full layout, multi-column grids where appropriate

---

## 7. Interaction

### Transitions

- Duration: `duration-150` (150ms). Nothing slower.
- Easing: `ease-in-out`
- Apply to: background-color, color, border-color, opacity only
- No transform animations in the main UI (no bounces, slides, scales)

### Loading States

- Skeleton: `bg-muted animate-pulse rounded-md` matching the shape of the expected content
- No spinners. Skeletons only.

### Empty States

- Centered text: `text-muted-foreground text-sm`
- Brief message + single action CTA
- Example: "No attempts yet. Log your first attempt →"

---

## 8. Dark/Light Toggle

- Default: system preference (`prefers-color-scheme`)
- Toggle: in the nav bar (Sun/Moon icon, ghost button style)
- Persistence: `localStorage` key `theme`
- Implementation: `class` strategy on `<html>` element (Tailwind `darkMode: 'class'`)

---

## 9. Do Not

- ❌ Use shadows for anything except modals/dropdowns (and even then, minimal)
- ❌ Use gradients
- ❌ Use rounded-full on cards or containers (only badges and avatars)
- ❌ Use more than one accent color
- ❌ Use decorative icons — only functional icons with clear meaning
- ❌ Use toast notifications for success — inline confirmation only
- ❌ Add custom fonts or font-loading
- ❌ Use `text-base` (1rem) for body text — use `text-sm`
- ❌ Invent new spacing values — use the defined scale
