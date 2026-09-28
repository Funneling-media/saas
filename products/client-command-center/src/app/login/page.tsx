import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button, Field, Flash } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function sendLink(fd: FormData) {
  "use server";
  const email = String(fd.get("email") ?? "").trim();
  const next = String(fd.get("next") ?? "/");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/setup");
  const origin = (await headers()).get("origin") ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Only invited team members can sign in; links never create accounts.
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(safeNext)}` },
  });
  // Same message either way, so the form does not reveal which emails have accounts.
  const params: Record<string, string> =
    error?.status === 429
      ? { error: "Too many sign-in attempts. Wait a minute and try again." }
      : { ok: "If that email belongs to a team member, a sign-in link is on its way." };
  redirect(`/login?${new URLSearchParams(params)}`);
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <Flash ok={one(sp.ok)} error={one(sp.error)} />
      <form action={sendLink} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={one(sp.next) ?? "/"} />
        <Field label="Work email" name="email" type="email" required />
        <Button>Email me a sign-in link</Button>
      </form>
    </div>
  );
}
