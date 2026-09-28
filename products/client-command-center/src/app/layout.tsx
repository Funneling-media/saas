import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { currentUserId } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Command Center",
  description: "Internal fulfillment operating system: scope, versions, evidence and approvals.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const userId = await currentUserId();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:p-2">
          Skip to content
        </a>
        <header className="border-b border-slate-200 bg-white">
          <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">
              Client Command Center
            </Link>
            {userId && (
              <>
                <Link href="/" className="text-slate-700 hover:underline">
                  Clients
                </Link>
                <Link href="/integrations" className="text-slate-700 hover:underline">
                  Integrations
                </Link>
                <form action={signOutAction} className="ml-auto">
                  <button className="text-slate-700 hover:underline">Sign out</button>
                </form>
              </>
            )}
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
