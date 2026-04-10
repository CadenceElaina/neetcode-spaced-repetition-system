import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

function serializeError(obj: unknown, depth = 0): unknown {
  if (depth > 3 || !obj) return obj;
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack?.split("\n").slice(0, 5).join("\n"),
      cause: serializeError((obj as any).cause, depth + 1),
      ...Object.fromEntries(
        Object.getOwnPropertyNames(obj)
          .filter((k) => !["name", "message", "stack"].includes(k))
          .map((k) => [k, serializeError((obj as any)[k], depth + 1)])
      ),
    };
  }
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.getOwnPropertyNames(obj).map((k) => [
        k,
        serializeError((obj as any)[k], depth + 1),
      ])
    );
  }
  return obj;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      issuer: "https://github.com/login/oauth",
    },
  ],
  pages: {
    error: "/auth/error",
  },
  logger: {
    error: (error) => {
      console.error("[auth] Full error:", JSON.stringify(serializeError(error)));
    },
  },
});
