import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { Nav } from "@/components/nav";
import { auth, isAuthConfigured } from "@/auth";

export const metadata: Metadata = {
  title: "Aurora",
  description: "Spaced repetition for technical interviews",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isAuthenticated = false;
  if (isAuthConfigured) {
    try {
      const session = await auth();
      isAuthenticated = !!session?.user?.id;
    } catch {
      // Auth call failed — treat as unauthenticated
    }
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <Nav isAuthenticated={isAuthenticated} authConfigured={isAuthConfigured} isDemo={!isAuthenticated} />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
