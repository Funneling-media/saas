import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/domain/vocab";

export type MemberRow = {
  id: string;
  role: OrgRole;
  user_id: string;
  profile: { email: string | null; full_name: string | null } | null;
};

/** Members of an organization with their profile (RLS: members of the org only). */
export async function listOrganizationMembers(organizationId: string): Promise<MemberRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role, user_id, profile:profiles(email, full_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  type Raw = Omit<MemberRow, "profile"> & { profile: MemberRow["profile"] | MemberRow["profile"][] };
  return (data as unknown as Raw[]).map((r) => ({
    ...r,
    profile: Array.isArray(r.profile) ? (r.profile[0] ?? null) : r.profile,
  }));
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("workspaces").update({ name }).eq("id", workspaceId);
  if (error) throw error;
}

export async function updateProfileName(userId: string, fullName: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);
  if (error) throw error;
  await supabase.auth.updateUser({ data: { full_name: fullName } });
}
