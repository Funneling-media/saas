import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolveWorkspace } from "@/db/organizations";
import { listOrganizationMembers } from "@/db/members";
import { can } from "@/domain/permissions";
import { orgRoleLabel } from "@/domain/vocab";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProfileForm, WorkspaceNameForm } from "./settings-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/[org]/[workspace]/settings">) {
  const { org, workspace } = await params;
  const [user, ctx] = await Promise.all([requireUser(), resolveWorkspace(org, workspace)]);
  if (!ctx) notFound();
  const members = await listOrganizationMembers(ctx.organization.id);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Settings" description="Workspace, team and your account." />

      <section aria-labelledby="ws-heading" className="space-y-3">
        <h2 id="ws-heading" className="text-sm font-medium">
          Workspace
        </h2>
        <WorkspaceNameForm
          org={org}
          workspace={workspace}
          name={ctx.workspace.name}
          canEdit={can(ctx.role, "workspace.manage")}
        />
        <p className="text-muted-foreground text-xs">
          Organization: {ctx.organization.name} · Your role: {orgRoleLabel[ctx.role]}
        </p>
      </section>

      <section aria-labelledby="team-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="team-heading" className="text-sm font-medium">
            Team
          </h2>
          <Badge variant="outline">Invites · Planned</Badge>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-28">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.profile?.full_name ?? "—"}
                    {m.user_id === user.id && (
                      <span className="text-muted-foreground ml-2 text-xs">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.profile?.email ?? "—"}</TableCell>
                  <TableCell>{orgRoleLabel[m.role]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground text-xs">
          Inviting teammates by email arrives with Milestone 2 hardening. Roles: owner, admin,
          member, viewer.
        </p>
      </section>

      <section aria-labelledby="account-heading" className="space-y-3">
        <h2 id="account-heading" className="text-sm font-medium">
          Your account
        </h2>
        <ProfileForm fullName={user.fullName ?? ""} />
        <p className="text-muted-foreground text-xs">Signed in as {user.email}</p>
      </section>
    </div>
  );
}
