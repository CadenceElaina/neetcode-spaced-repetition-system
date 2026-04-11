import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works — Aurora",
  description: "Algorithm details, glossary, and design rationale for Aurora",
};

export default function InfoPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-12 text-sm leading-relaxed text-foreground">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">How Aurora Works</h1>
        <p className="text-muted-foreground">
          The scheduling engine behind Aurora, explained from scratch. No statistics background required.
        </p>
      </header>

      {/* ── TOC ── */}
      <nav className="rounded-lg border border-border p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Contents</p>
        <ul className="space-y-1 text-accent">
          <li><a href="#core-idea" className="hover:underline">The Core Idea</a></li>
          <li><a href="#stability" className="hover:underline">Stability</a></li>
          <li><a href="#retrievability" className="hover:underline">Retrievability (the Forgetting Curve)</a></li>
          <li><a href="#scoring" className="hover:underline">How Attempts Are Scored</a></li>
          <li><a href="#review-queue" className="hover:underline">Review Queue Priority</a></li>
          <li><a href="#readiness" className="hover:underline">Readiness Score</a></li>
          <li><a href="#glossary" className="hover:underline">Glossary</a></li>
          <li><a href="#further-reading" className="hover:underline">Further Reading</a></li>
        </ul>
      </nav>

      {/* ── Core Idea ── */}
      <section id="core-idea" className="space-y-3">
        <h2 className="text-lg font-semibold">The Core Idea</h2>
        <p>
          When you learn something, you start forgetting it immediately. But each time you successfully recall it,
          your memory gets a little more durable. <strong>Spaced repetition</strong> exploits this: review right before
          you&apos;d forget, and each review pushes the next one further into the future.
        </p>
        <p>
          Aurora tracks two things for every problem you&apos;ve attempted:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Stability</strong> — how durable your memory is (measured in days)</li>
          <li><strong>Retrievability</strong> — the probability you can solve it right now (0–100%)</li>
        </ul>
        <p>
          Stability goes up when you solve problems well. Retrievability decays over time, which is what triggers
          reviews. The system&apos;s job is to keep retrievability high across all your problems using the fewest
          reviews possible.
        </p>
      </section>

      {/* ── Stability ── */}
      <section id="stability" className="space-y-3">
        <h2 className="text-lg font-semibold">Stability</h2>
        <p>
          Stability is a number in days. If your stability for Two Sum is 7, that means your memory of how to solve
          Two Sum is strong enough to last about 7 days before it starts fading significantly.
        </p>
        <p>After each attempt, stability is updated:</p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs">
          new stability = old stability × (base multiplier + modifiers)
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Multiplier <strong>above 1.0</strong> → stability grows → your next review is scheduled further out</li>
          <li>Multiplier <strong>below 1.0</strong> → stability shrinks → you review sooner</li>
        </ul>

        <h3 className="text-sm font-semibold pt-2">Example</h3>
        <p>
          You have stability = 4 days for Container With Most Water. You solve it independently with the optimal
          approach and confidence 4. Base multiplier: 2.5. Confidence bonus: +0.1. New stability: 4 × 2.6 = <strong>10.4 days</strong>.
          Your next review is ~10 days out.
        </p>
        <p>
          Next review: you struggle and need a hint (Partial), confidence 2. Base multiplier: 1.1. Confidence penalty: −0.2.
          New stability: 10.4 × 0.9 = <strong>9.4 days</strong>. Stability shrank — and because you had low confidence
          with a partial solve, the system forces a review in just 1 day regardless.
        </p>

        <h3 className="text-sm font-semibold pt-2">First Attempt</h3>
        <p>
          For your very first attempt at a problem, initial stability starts at <strong>0.5 days</strong> (12 hours)
          multiplied by the same formula. Even a perfect first solve (0.5 × 2.5 = 1.25 days) means you review
          within a day or two — because one solve doesn&apos;t prove long-term retention.
        </p>

        <p className="text-xs text-muted-foreground">
          Stability is clamped between 0.5 days (minimum) and 365 days (maximum).
        </p>
      </section>

      {/* ── Retrievability ── */}
      <section id="retrievability" className="space-y-3">
        <h2 className="text-lg font-semibold">Retrievability (the Forgetting Curve)</h2>
        <p>
          Retrievability answers: <em>&ldquo;If I sat down to solve this right now, what&apos;s the chance I could do it?&rdquo;</em>
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs">
          R = e<sup>−days_since_review / stability</sup>
        </div>

        <h3 className="text-sm font-semibold pt-2">Why this formula?</h3>
        <p>
          This is <strong>exponential decay</strong> — the same math that describes radioactive decay and cooling coffee.
          It&apos;s used because human forgetting empirically follows this shape (this was first measured by Hermann
          Ebbinghaus in 1885 and has been confirmed many times since).
        </p>
        <p>The key property: <strong>you forget fast at first, then slower</strong>. The day after a review,
          retrievability drops quickly. A week later, it&apos;s still dropping but more gradually.
        </p>
        <p>
          <code className="text-xs">e ≈ 2.718</code> is the natural mathematical constant — it&apos;s not a choice,
          it&apos;s the base that makes the decay rate proportional to current memory strength.
          The <code className="text-xs">−days/stability</code> part means higher stability = slower decay.
        </p>

        <h3 className="text-sm font-semibold pt-2">Concrete examples</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Stability</th>
                <th className="py-2 pr-4">After 1 day</th>
                <th className="py-2 pr-4">After 3 days</th>
                <th className="py-2 pr-4">After 7 days</th>
                <th className="py-2 pr-4">After 14 days</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-sans">2 days</td>
                <td className="py-2 pr-4">61%</td>
                <td className="py-2 pr-4">30%*</td>
                <td className="py-2 pr-4">30%*</td>
                <td className="py-2 pr-4">30%*</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-sans">7 days</td>
                <td className="py-2 pr-4">87%</td>
                <td className="py-2 pr-4">65%</td>
                <td className="py-2 pr-4">37%</td>
                <td className="py-2 pr-4">30%*</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-sans">30 days</td>
                <td className="py-2 pr-4">97%</td>
                <td className="py-2 pr-4">90%</td>
                <td className="py-2 pr-4">79%</td>
                <td className="py-2 pr-4">63%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          * Retrievability has a floor of 30%. Even for a problem you haven&apos;t reviewed in months, the system
          assumes you retained <em>something</em> — the problem name, the general pattern, a vague approach. Without
          the floor, a problem 60 days overdue would show 0% and be indistinguishable from one you&apos;ve never seen.
        </p>

        <h3 className="text-sm font-semibold pt-2">What the labels mean</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Retrievability</th>
                <th className="py-2 pr-4">Label</th>
                <th className="py-2 pr-4">What it means</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">≥ 80%</td><td className="py-2 pr-4 text-green-500 font-medium">Strong</td><td className="py-2 pr-4">You can probably solve this cold</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">60–79%</td><td className="py-2 pr-4 text-emerald-400 font-medium">Good</td><td className="py-2 pr-4">Likely solvable, might need a moment</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">40–59%</td><td className="py-2 pr-4 text-amber-500 font-medium">Fading</td><td className="py-2 pr-4">You might struggle — review soon</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">20–39%</td><td className="py-2 pr-4 text-orange-500 font-medium">Weak</td><td className="py-2 pr-4">Likely can&apos;t solve without help</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">&lt; 20%</td><td className="py-2 pr-4 text-red-500 font-medium">Critical</td><td className="py-2 pr-4">Essentially relearning from scratch</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Scoring ── */}
      <section id="scoring" className="space-y-3">
        <h2 className="text-lg font-semibold">How Attempts Are Scored</h2>
        <p>
          When you log an attempt, two things determine how much your stability changes: the <strong>base multiplier</strong> (how well you did)
          and <strong>modifiers</strong> (bonus/penalty details).
        </p>

        <h3 className="text-sm font-semibold pt-2">Base Multipliers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2 pr-4">Optimal</th>
                <th className="py-2 pr-4">Brute Force</th>
                <th className="py-2 pr-4">No Solution</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium">Solved independently</td>
                <td className="py-2 pr-4 font-mono text-green-500">2.5×</td>
                <td className="py-2 pr-4 font-mono text-amber-500">1.5×</td>
                <td className="py-2 pr-4 text-muted-foreground">—</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium">Needed help (Partial)</td>
                <td className="py-2 pr-4 font-mono text-muted-foreground" colSpan={2}>1.1× (quality ignored)</td>
                <td className="py-2 pr-4 text-muted-foreground">—</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-medium">Could not solve</td>
                <td className="py-2 pr-4 text-muted-foreground">—</td>
                <td className="py-2 pr-4 font-mono text-orange-500">0.8×</td>
                <td className="py-2 pr-4 font-mono text-red-500">0.5×</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Why is Partial always 1.1× regardless of quality?</strong> If you needed a hint or AI help, you
          didn&apos;t prove you can solve it yourself. Whether you arrived at the optimal or brute force approach with
          help doesn&apos;t meaningfully change how well you <em>know</em> the problem. The quality question is only
          asked when you solved independently.
        </p>

        <h3 className="text-sm font-semibold pt-2">Modifiers (only apply to independent solves)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Signal</th>
                <th className="py-2 pr-4">Modifier</th>
                <th className="py-2 pr-4">Why</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="py-2 pr-4">Rewrote from scratch</td><td className="py-2 pr-4 font-mono text-green-500">+0.5</td><td className="py-2 pr-4">Proves you can write it clean, not just fix old code</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4">Correct time complexity</td><td className="py-2 pr-4 font-mono text-green-500">+0.2</td><td className="py-2 pr-4">You understand the algorithm&apos;s efficiency</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4">Correct space complexity</td><td className="py-2 pr-4 font-mono text-green-500">+0.2</td><td className="py-2 pr-4">You understand the memory usage</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4">Fast solve (Medium &lt; 10 min)</td><td className="py-2 pr-4 font-mono text-green-500">+0.2</td><td className="py-2 pr-4">Speed indicates strong recall</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold pt-2">Confidence (applies to all attempts)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Modifier</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">5</td><td className="py-2 pr-4">Solve cold, no issues</td><td className="py-2 pr-4 font-mono text-green-500">+0.3</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">4</td><td className="py-2 pr-4">Can code it, minor bugs</td><td className="py-2 pr-4 font-mono text-green-500">+0.1</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">3</td><td className="py-2 pr-4">Can pseudocode optimal, maybe code</td><td className="py-2 pr-4 font-mono">0</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">2</td><td className="py-2 pr-4">Can pseudocode brute force</td><td className="py-2 pr-4 font-mono text-orange-500">−0.2</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">1</td><td className="py-2 pr-4">Can&apos;t solve or pseudocode</td><td className="py-2 pr-4 font-mono text-red-500">−0.4</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold pt-2">Special scheduling rules</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Could not solve</strong> → review is scheduled immediately (due now)</li>
          <li><strong>Partial + confidence ≤ 2</strong> → review forced to 1 day, regardless of stability math</li>
        </ul>
      </section>

      {/* ── Review Queue ── */}
      <section id="review-queue" className="space-y-3">
        <h2 className="text-lg font-semibold">Review Queue Priority</h2>
        <p>When multiple problems are due, which do you review first? The queue sorts by priority:</p>
        <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs">
          priority = (1 − retrievability) × weight
        </div>
        <p>
          Problems you&apos;re most likely to have forgotten score highest. A problem at 30% retrievability gets
          urgency 0.7; one at 80% gets 0.2.
        </p>
        <p>The <strong>weight</strong> adjusts for importance:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Difficulty</strong>: Hard 1.1×, Medium 1.0×, Easy 0.8×</li>
          <li><strong>Blind 75</strong>: +0.2 bonus — these are the most commonly asked interview problems,
            so they get a small tiebreaker when urgency is similar</li>
          <li><strong>Weak category</strong>: +0.3 if your average retention in that category is below 60% —
            this helps shore up gaps (e.g., if your Stack problems are all fading, they get prioritized)</li>
        </ul>
      </section>

      {/* ── Readiness ── */}
      <section id="readiness" className="space-y-3">
        <h2 className="text-lg font-semibold">Readiness Score</h2>
        <p>
          The readiness score (0–100) estimates how prepared you are for a coding interview. It combines four factors:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Factor</th>
                <th className="py-2 pr-4">Weight</th>
                <th className="py-2 pr-4">What it measures</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-medium">Coverage</td><td className="py-2 pr-4 font-mono">30%</td><td className="py-2 pr-4">Percentage of NeetCode 150 you&apos;ve attempted</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-medium">Retention</td><td className="py-2 pr-4 font-mono">40%</td><td className="py-2 pr-4">Percentage of attempted problems with retrievability &gt; 70%</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-medium">Category Balance</td><td className="py-2 pr-4 font-mono">20%</td><td className="py-2 pr-4">Your worst category&apos;s average retention — penalizes big blind spots</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-medium">Consistency</td><td className="py-2 pr-4 font-mono">10%</td><td className="py-2 pr-4">Percentage of scheduled reviews completed in the last 14 days</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Retention is weighted highest (40%) because knowing 20 problems cold beats having seen 100 problems once.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Tier</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">90–100</td><td className="py-2 pr-4"><span className="rounded bg-violet-500 px-2 py-0.5 text-white text-xs font-medium">S</span></td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">75–89</td><td className="py-2 pr-4"><span className="rounded bg-blue-500 px-2 py-0.5 text-white text-xs font-medium">A</span></td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">55–74</td><td className="py-2 pr-4"><span className="rounded bg-emerald-500 px-2 py-0.5 text-white text-xs font-medium">B</span></td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">35–54</td><td className="py-2 pr-4"><span className="rounded bg-amber-500 px-2 py-0.5 text-white text-xs font-medium">C</span></td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono">0–34</td><td className="py-2 pr-4"><span className="rounded bg-zinc-400 px-2 py-0.5 text-white text-xs font-medium">D</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Glossary ── */}
      <section id="glossary" className="space-y-3">
        <h2 className="text-lg font-semibold">Glossary</h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold">Spaced Repetition</dt>
            <dd className="text-muted-foreground">A learning technique where reviews are scheduled at increasing intervals. Each successful review pushes the next one further out. Based on the finding that memory consolidates with well-timed recall practice.</dd>
          </div>
          <div>
            <dt className="font-semibold">FSRS (Free Spaced Repetition Scheduler)</dt>
            <dd className="text-muted-foreground">An open-source spaced repetition algorithm by Jarrett Ye. Aurora uses a modified version adapted for coding problems (multi-signal scoring instead of single pass/fail grades).</dd>
          </div>
          <div>
            <dt className="font-semibold">Stability</dt>
            <dd className="text-muted-foreground">How durable your memory of a problem is, measured in days. Higher stability = slower forgetting = longer intervals between reviews.</dd>
          </div>
          <div>
            <dt className="font-semibold">Retrievability</dt>
            <dd className="text-muted-foreground">The estimated probability (0–100%) that you could solve a problem right now without help. Decays exponentially over time since your last review.</dd>
          </div>
          <div>
            <dt className="font-semibold">Exponential Decay</dt>
            <dd className="text-muted-foreground">A pattern where something decreases by a consistent proportion over equal time periods. Memory follows this shape: fast loss early, slowing over time. The formula R = e<sup className="text-[10px]">−t/S</sup> captures this.</dd>
          </div>
          <div>
            <dt className="font-semibold">Forgetting Curve</dt>
            <dd className="text-muted-foreground">The graph of retrievability over time. First described by Hermann Ebbinghaus in 1885 through experiments on memorizing nonsense syllables. The exponential decay model fits his data and has been confirmed repeatedly since.</dd>
          </div>
          <div>
            <dt className="font-semibold">NeetCode 150</dt>
            <dd className="text-muted-foreground">A curated list of 150 LeetCode problems covering all major algorithms and data structures needed for coding interviews. Organized into categories like Arrays & Hashing, Two Pointers, Stack, etc.</dd>
          </div>
          <div>
            <dt className="font-semibold">Blind 75</dt>
            <dd className="text-muted-foreground">A subset of 75 problems from a viral list of the most frequently asked coding interview questions. These are given a small priority bonus in the review queue because they&apos;re statistically more likely to appear in interviews.</dd>
          </div>
          <div>
            <dt className="font-semibold">Readiness Score</dt>
            <dd className="text-muted-foreground">A 0–100 composite score estimating interview preparedness. Combines coverage (how many problems you&apos;ve seen), retention (how many you remember), category balance (no blind spots), and consistency (keeping up with reviews).</dd>
          </div>
        </dl>
      </section>

      {/* ── Further Reading ── */}
      <section id="further-reading" className="space-y-3">
        <h2 className="text-lg font-semibold">Further Reading</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              FSRS Algorithm Wiki
            </a>
            <span className="text-muted-foreground"> — the research behind modern spaced repetition scheduling</span>
          </li>
          <li>
            <a href="https://en.wikipedia.org/wiki/Forgetting_curve" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Forgetting Curve (Wikipedia)
            </a>
            <span className="text-muted-foreground"> — Ebbinghaus&apos;s original research and subsequent confirmations</span>
          </li>
          <li>
            <a href="https://en.wikipedia.org/wiki/Spaced_repetition" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Spaced Repetition (Wikipedia)
            </a>
            <span className="text-muted-foreground"> — overview of the learning technique and its evidence base</span>
          </li>
          <li>
            <a href="https://neetcode.io/roadmap" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              NeetCode Roadmap
            </a>
            <span className="text-muted-foreground"> — the NeetCode 150 problem list and category structure</span>
          </li>
          <li>
            <Link href="/problems" className="text-accent hover:underline">
              Problem List
            </Link>
            <span className="text-muted-foreground"> — browse all 150 problems with optimal complexity and links</span>
          </li>
        </ul>
      </section>

      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          The algorithm source code is in{" "}
          <a href="https://github.com/CadenceElaina/aurora/blob/main/src/lib/srs.ts" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            src/lib/srs.ts
          </a>. Full design rationale is in{" "}
          <a href="https://github.com/CadenceElaina/aurora/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            docs/ARCHITECTURE.md
          </a>.
        </p>
      </footer>
    </article>
  );
}
