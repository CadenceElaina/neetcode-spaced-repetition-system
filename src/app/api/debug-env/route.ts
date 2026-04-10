import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars (show length + first 4 chars for non-secret vars)
  const envVars = ["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "DATABASE_URL"];
  results.envVars = Object.fromEntries(
    envVars.map((key) => {
      const val = process.env[key];
      if (!val) return [key, { status: "MISSING" }];
      return [
        key,
        {
          status: "SET",
          length: val.length,
          // Show prefix only for non-secret values to help detect whitespace/quote issues
          prefix: key === "AUTH_GITHUB_ID" || key === "DATABASE_URL"
            ? val.slice(0, 8) + "..."
            : undefined,
          hasWhitespace: val !== val.trim(),
          hasQuotes: val.startsWith('"') || val.startsWith("'"),
        },
      ];
    })
  );

  // 2. Test database connectivity
  try {
    const start = Date.now();
    const result = await db.execute(sql`SELECT 1 as ping`);
    results.database = {
      status: "CONNECTED",
      latencyMs: Date.now() - start,
      pingResult: result,
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    results.database = {
      status: "FAILED",
      error: error.message,
      name: error.name,
    };
  }

  // 3. Check if auth tables exist
  try {
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens')
      ORDER BY table_name
    `);
    results.authTables = {
      status: "OK",
      found: (tables as unknown as Array<{ table_name: string }>).map((r) => r.table_name),
    };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    results.authTables = {
      status: "FAILED",
      error: error.message,
    };
  }

  // 4. Check table row counts (to see if anything was ever written)
  try {
    const counts = await db.execute(sql`
      SELECT 
        (SELECT count(*) FROM users) as users_count,
        (SELECT count(*) FROM accounts) as accounts_count,
        (SELECT count(*) FROM sessions) as sessions_count
    `);
    results.tableCounts = counts[0];
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));
    results.tableCounts = { error: error.message };
  }

  return NextResponse.json(results, { status: 200 });
}
