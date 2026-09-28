import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { listMemberships } from "@/db/organizations";

/** Entry point: send the user to the right place. */
export default async function RootPage() {
  if (!isSupabaseConfigured()) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await listMemberships();
  const first = memberships[0];
  const workspace = first?.workspaces[0];
  if (!first || !workspace) redirect("/onboarding");
  redirect(`/${first.organization.slug}/${workspace.slug}`);
}
