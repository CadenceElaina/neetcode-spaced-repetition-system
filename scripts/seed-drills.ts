/**
 * Seed script: reads drills.json and inserts into the syntax_drill table.
 *
 * Usage:
 *   npx tsx scripts/seed-drills.ts
 *
 * Requires DATABASE_URL in .env.local
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { readFileSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { syntaxDrills } from "../src/db/schema";
import { sql } from "drizzle-orm";

interface SeedDrill {
  title: string;
  category: string;
  level: number;
  prompt: string;
  expectedCode: string;
  alternatives: string[];
  explanation: string;
  tags: string[];
}

async function main() {
  const jsonPath = resolve(__dirname, "../drills.json");
  const items: SeedDrill[] = JSON.parse(readFileSync(jsonPath, "utf-8"));

  console.log(`Seeding ${items.length} drills...`);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  for (const d of items) {
    await db
      .insert(syntaxDrills)
      .values({
        title: d.title,
        category: d.category,
        level: d.level,
        language: "python",
        prompt: d.prompt,
        expectedCode: d.expectedCode,
        alternatives: d.alternatives,
        explanation: d.explanation,
        tags: d.tags,
      })
      .onConflictDoNothing();
  }

  console.log(`✓ Seeded ${items.length} drills`);
  await client.end();
}

main().catch((err) => {
  console.error("Drill seed failed:", err);
  process.exit(1);
});
