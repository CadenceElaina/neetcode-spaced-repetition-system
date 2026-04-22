import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Keep-alive endpoint for Supabase free tier.
 * Supabase pauses projects after 7 days of inactivity.
 * vercel.json schedules this to run every 3 days (safe buffer).
 *
 * Secured by CRON_SECRET: Vercel automatically sends
 * `Authorization: Bearer <CRON_SECRET>` with cron invocations.
 */
export async function GET(request: Request) {
  // Verify cron secret in production to prevent external abuse
  const secret = process.env.CRON_SECRET;
  if (secret && process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/ping] DB ping failed:", err);
    return Response.json({ ok: false, error: "DB ping failed" }, { status: 500 });
  }
}
