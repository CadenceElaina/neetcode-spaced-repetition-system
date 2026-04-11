import Link from "next/link";

export const metadata = { title: "Setup Guide — Aurora" };

const errorMessages: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to sign in. If you believe this is a mistake, please contact the site owner.",
  },
  Verification: {
    title: "Verification Error",
    description: "The sign-in link has expired or has already been used. Please try signing in again.",
  },
};

const fallback = {
  title: "Authentication Error",
  description: "Something went wrong during sign-in. Please try again.",
};

/* The setup guide steps – shown for Configuration and DatabaseError */
function SetupGuide({ error }: { error: string }) {
  const isDbError = error === "DatabaseError";

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isDbError ? "Database Setup Needed" : "Welcome! Let\u2019s get you set up."}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aurora is a self-hosted app. You need to configure a few environment
            variables to enable sign-in and personal tracking.
          </p>
        </div>

        {/* Step-by-step guide */}
        <div className="space-y-4">
          {/* Step 1: Database */}
          <div className={`rounded-lg border p-4 space-y-2 ${isDbError ? "border-accent/50 bg-accent/5" : "border-border bg-muted/50"}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">1</span>
              <h3 className="text-sm font-semibold text-foreground">Set up a PostgreSQL database</h3>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Create a free Supabase or Neon database, then add the connection string to your environment.
            </p>
            <div className="pl-8">
              <code className="block rounded bg-background border border-border px-3 py-2 text-xs font-mono text-foreground">
                DATABASE_URL=&quot;postgresql://user:pass@host:5432/dbname&quot;
              </code>
            </div>
          </div>

          {/* Step 2: Auth Secret */}
          <div className={`rounded-lg border p-4 space-y-2 ${!isDbError ? "border-accent/50 bg-accent/5" : "border-border bg-muted/50"}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">2</span>
              <h3 className="text-sm font-semibold text-foreground">Generate an auth secret</h3>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Run this command to generate a secure secret:
            </p>
            <div className="pl-8">
              <code className="block rounded bg-background border border-border px-3 py-2 text-xs font-mono text-foreground">
                npx auth secret
              </code>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              Then add it to your <code className="text-foreground">.env.local</code>:
            </p>
            <div className="pl-8">
              <code className="block rounded bg-background border border-border px-3 py-2 text-xs font-mono text-foreground">
                AUTH_SECRET=&quot;your-generated-secret&quot;
              </code>
            </div>
          </div>

          {/* Step 3: GitHub OAuth */}
          <div className={`rounded-lg border p-4 space-y-2 ${!isDbError ? "border-accent/50 bg-accent/5" : "border-border bg-muted/50"}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">3</span>
              <h3 className="text-sm font-semibold text-foreground">Create a GitHub OAuth App</h3>
            </div>
            <ol className="text-xs text-muted-foreground pl-8 space-y-1 list-decimal list-inside">
              <li>Go to <strong className="text-foreground">GitHub Settings &rarr; Developer Settings &rarr; OAuth Apps</strong></li>
              <li>Set Homepage URL to <code className="text-foreground">http://localhost:3000</code></li>
              <li>Set Callback URL to <code className="text-foreground">http://localhost:3000/api/auth/callback/github</code></li>
              <li>Copy the Client ID and generate a Client Secret</li>
            </ol>
            <div className="pl-8">
              <code className="block rounded bg-background border border-border px-3 py-2 text-xs font-mono text-foreground whitespace-pre">
                AUTH_GITHUB_ID=&quot;your-client-id&quot;{"\n"}AUTH_GITHUB_SECRET=&quot;your-client-secret&quot;
              </code>
            </div>
          </div>

          {/* Step 4: Run migrations */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">4</span>
              <h3 className="text-sm font-semibold text-foreground">Run database migrations &amp; seed</h3>
            </div>
            <div className="pl-8">
              <code className="block rounded bg-background border border-border px-3 py-2 text-xs font-mono text-foreground whitespace-pre">
                npx drizzle-kit push{"\n"}npx tsx scripts/seed.ts
              </code>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_16px_var(--glow)]"
          >
            Go Home
          </Link>
          <Link
            href="/problems"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            Browse Problems
          </Link>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          You can still browse problems and read the info page without auth. Sign-in is only needed
          for personal progress tracking.
        </p>
      </div>
    </div>
  );
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Configuration and DatabaseError get the full setup guide
  if (error === "Configuration" || error === "DatabaseError") {
    return <SetupGuide error={error} />;
  }

  // Other errors get the compact error card
  const { title, description } = errorMessages[error ?? ""] ?? fallback;

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md rounded-lg border border-border bg-muted p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {error && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Error code: {error}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/api/auth/signin"
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-all duration-150 hover:shadow-[0_0_16px_var(--glow)]"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
