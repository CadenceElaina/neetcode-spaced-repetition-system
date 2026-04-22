import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

/**
 * True when all required auth env vars are present.
 * Used by layout/nav to hide sign-in UI when unconfigured.
 */
export const isAuthConfigured = !!(
  process.env.AUTH_SECRET &&
  process.env.AUTH_GITHUB_ID &&
  process.env.AUTH_GITHUB_SECRET
);

/* When auth is not configured, export safe no-op functions so pages
   that `import { auth } from "@/auth"` never crash at module load. */
const authResult = isAuthConfigured
  ? NextAuth({
      trustHost: true,
      secret: process.env.AUTH_SECRET,
      adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }),
      providers: [
        {
          ...GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
          // Required: oauth4webapi v3 enforces RFC 9207 issuer validation
          issuer: "https://github.com/login/oauth",
        },
      ],
      pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
      },
      callbacks: {
        async signIn({ user }) {
          const maxStr = process.env.MAX_USERS;
          if (!maxStr) return true;
          const maxUsers = parseInt(maxStr, 10);
          if (isNaN(maxUsers)) return true;

          // Returning users (already in DB) are always allowed through
          if (user.email) {
            const existing = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.email, user.email))
              .limit(1);
            if (existing.length > 0) return true;
          }

          // New user — check total against cap
          const [{ total }] = await db.select({ total: count() }).from(users);
          if (total >= maxUsers) {
            return "/auth/error?error=UserCapReached";
          }
          return true;
        },
      },
    })
  : {
      handlers: {
        GET: () =>
          Response.redirect(
            new URL("/auth/error?error=Configuration", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
          ),
        POST: () => Response.json({ error: "Auth not configured" }, { status: 501 }),
      },
      auth: (async () => null) as unknown as ReturnType<typeof NextAuth>["auth"],
      signIn: (async () => undefined) as unknown as ReturnType<typeof NextAuth>["signIn"],
      signOut: (async () => undefined) as unknown as ReturnType<typeof NextAuth>["signOut"],
    };

export const { handlers, auth, signIn, signOut } = authResult;
