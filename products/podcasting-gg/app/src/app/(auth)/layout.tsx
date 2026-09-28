import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/app/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_minmax(0,480px)]">
      <aside className="bg-sidebar hidden flex-col justify-between border-r p-10 lg:flex">
        <Link href="/" aria-label="Podcasting.gg home">
          <Wordmark />
        </Link>
        <div className="max-w-md space-y-4">
          <p className="text-2xl leading-snug font-medium tracking-tight text-balance">
            Twenty strategic conversations. One business network that compounds.
          </p>
          <p className="text-muted-foreground">
            Podcasting.gg turns each episode into relationships, reusable knowledge and detected
            business opportunities — not just a file on a feed.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Funneling Media
        </p>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
