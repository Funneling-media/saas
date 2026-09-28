import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/domain/vocab";
import { slugify } from "@/lib/utils";

export type Membership = {
  organization: { id: string; name: string; slug: string };
  role: OrgRole;
  workspaces: { id: string; name: string; slug: string }[];
};

/** All organizations the current user belongs to, with their workspaces. */
export const listMemberships = cache(async (): Promise<Membership[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "role, organization:organizations!inner(id, name, slug, deleted_at, workspaces(id, name, slug, deleted_at))",
    )
    .order("created_at", { ascending: true });
  if (error) throw error;

  type Row = {
    role: OrgRole;
    organization: {
      id: string;
      name: string;
      slug: string;
      deleted_at: string | null;
      workspaces: { id: string; name: string; slug: string; deleted_at: string | null }[];
    };
  };

  return (data as unknown as Row[])
    .filter((r) => !r.organization.deleted_at)
    .map((r) => ({
      role: r.role,
      organization: { id: r.organization.id, name: r.organization.name, slug: r.organization.slug },
      workspaces: r.organization.workspaces
        .filter((w) => !w.deleted_at)
        .map((w) => ({ id: w.id, name: w.name, slug: w.slug })),
    }));
});

export type WorkspaceContext = {
  organization: { id: string; name: string; slug: string };
  workspace: { id: string; name: string; slug: string };
  role: OrgRole;
  memberships: Membership[];
};

/** Resolve `/[org]/[workspace]` to ids the current user may access, or null. */
export async function resolveWorkspace(
  orgSlug: string,
  workspaceSlug: string,
): Promise<WorkspaceContext | null> {
  const memberships = await listMemberships();
  const membership = memberships.find((m) => m.organization.slug === orgSlug);
  const workspace = membership?.workspaces.find((w) => w.slug === workspaceSlug);
  if (!membership || !workspace) return null;
  return { organization: membership.organization, workspace, role: membership.role, memberships };
}

/** Create an organization plus its first workspace; the DB trigger makes the creator owner. */
export async function createOrganizationWithWorkspace(input: {
  organizationName: string;
  workspaceName?: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const baseSlug = slugify(input.organizationName) || "workspace";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: input.organizationName, slug, created_by: input.userId })
    .select("id, slug")
    .single();
  if (orgError) throw orgError;

  const workspaceName = input.workspaceName?.trim() || input.organizationName;
  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      organization_id: org.id,
      name: workspaceName,
      slug: slugify(workspaceName) || "main",
    })
    .select("id, slug")
    .single();
  if (wsError) throw wsError;

  return { orgSlug: org.slug as string, workspaceSlug: ws.slug as string };
}
