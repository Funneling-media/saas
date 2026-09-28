import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolveWorkspace } from "@/db/organizations";
import { AppShell } from "@/components/app/app-shell";
import { Toaster } from "@/components/ui/sonner";

export default async function WorkspaceLayout({
  children,
  params,
}: LayoutProps<"/[org]/[workspace]">) {
  const user = await requireUser();
  const { org, workspace } = await params;
  const ctx = await resolveWorkspace(org, workspace);
  if (!ctx) notFound();

  return (
    <AppShell
      base={`/${ctx.organization.slug}/${ctx.workspace.slug}`}
      organization={ctx.organization}
      workspace={ctx.workspace}
      memberships={ctx.memberships}
      user={{ email: user.email, fullName: user.fullName }}
    >
      {children}
      <Toaster />
    </AppShell>
  );
}
