import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/env";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/app/wordmark";

export const metadata: Metadata = { title: "Setup" };

const steps = [
  {
    title: "Create a free Supabase project (or run the Supabase CLI locally)",
    body: "Supabase gives the app its database, sign-in and file storage. The free tier is enough for development.",
  },
  {
    title: "Copy app/.env.example to app/.env.local",
    body: "Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase → Settings → API.",
  },
  {
    title: "Apply the database migrations and demo data",
    body: "Run `supabase db push` (hosted) or `supabase db reset` (CLI). See docs/LOCAL_DEVELOPMENT.md.",
  },
  { title: "Restart `pnpm dev`", body: "This page disappears once the app can reach Supabase." },
];

export default function SetupPage() {
  if (isSupabaseConfigured()) redirect("/");
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-8 p-6">
      <Wordmark />
      <div className="space-y-1">
        <h1 className="text-xl">Almost there: connect a database</h1>
        <p className="text-muted-foreground">
          The app is running, but it has nowhere to store your data yet. Four steps:
        </p>
      </div>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="bg-muted grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-muted-foreground text-sm">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground text-xs">
        No account keys are ever shown in the browser. Only the public URL and anon key are used
        here.
      </p>
    </main>
  );
}
