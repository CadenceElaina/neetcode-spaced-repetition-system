import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

// Wrap adapter methods to distinguish DB errors from config errors
const wrappedAdapter: Adapter = {
  ...adapter,
  createUser: async (...args) => {
    try {
      return await adapter.createUser!(...args);
    } catch (e) {
      console.error("[auth] Database error in createUser:", e);
      throw new Error("DatabaseError");
    }
  },
  getUserByEmail: async (...args) => {
    try {
      return await adapter.getUserByEmail!(...args);
    } catch (e) {
      console.error("[auth] Database error in getUserByEmail:", e);
      throw new Error("DatabaseError");
    }
  },
  getUserByAccount: async (...args) => {
    try {
      return await adapter.getUserByAccount!(...args);
    } catch (e) {
      console.error("[auth] Database error in getUserByAccount:", e);
      throw new Error("DatabaseError");
    }
  },
  linkAccount: async (...args) => {
    try {
      return await adapter.linkAccount!(...args);
    } catch (e) {
      console.error("[auth] Database error in linkAccount:", e);
      throw new Error("DatabaseError");
    }
  },
  createSession: async (...args) => {
    try {
      return await adapter.createSession!(...args);
    } catch (e) {
      console.error("[auth] Database error in createSession:", e);
      throw new Error("DatabaseError");
    }
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  adapter: wrappedAdapter,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    error: "/auth/error",
  },
});
