import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ApprovalEvent,
  Client,
  DeliverablePackage,
  DeliverableVersion,
  EvidenceItem,
  FeedbackItem,
  FulfillmentScope,
  MemberRole,
} from "@/lib/types";

/** All reads run as the signed-in user, so RLS decides what is visible. */
async function db() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export async function myMemberships() {
  const supabase = await db();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id, role, organizations(name)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    orgId: m.org_id as string,
    role: m.role as MemberRole,
    orgName: (m.organizations as unknown as { name: string } | null)?.name ?? "Organization",
  }));
}

export async function listClients() {
  const supabase = await db();
  const [{ data: clients, error }, { data: pkgs, error: pkgError }] = await Promise.all([
    supabase.from("clients").select("*").order("display_name"),
    supabase.from("deliverable_packages").select("client_id, status, position, title"),
  ]);
  if (error) throw error;
  if (pkgError) throw pkgError;
  return (clients as Client[]).map((c) => {
    const mine = (pkgs ?? []).filter((p) => p.client_id === c.id).sort((a, b) => a.position - b.position);
    const approved = mine.filter((p) => p.status === "approved").length;
    const current = mine.find((p) => p.status !== "approved" && p.status !== "locked");
    return { ...c, packageCount: mine.length, approvedCount: approved, currentPackage: current ?? null };
  });
}

export async function loadClientWorkspace(clientId: string) {
  const supabase = await db();
  const { data: client, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error) throw error;
  if (!client) return null;

  const [{ data: scope }, { data: packages }, memberships, { data: templates }] = await Promise.all([
    supabase.from("fulfillment_scopes").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("deliverable_packages").select("*").eq("client_id", clientId).order("position"),
    myMemberships(),
    supabase.from("scope_templates").select("code, version, name").order("code").order("version", { ascending: false }),
  ]);

  const packageIds = (packages ?? []).map((p) => p.id as string);
  const { data: versions } = packageIds.length
    ? await supabase.from("deliverable_versions").select("*").in("package_id", packageIds).order("version_number", { ascending: false })
    : { data: [] };
  const versionIds = (versions ?? []).map((v) => v.id as string);
  const [{ data: evidence }, { data: feedback }, { data: approvals }] = versionIds.length
    ? await Promise.all([
        supabase.from("evidence_items").select("*").in("version_id", versionIds).order("created_at"),
        supabase.from("feedback_items").select("*").in("version_id", versionIds).order("created_at"),
        supabase.from("approval_events").select("*").in("version_id", versionIds).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  let policy: { included_revision_rounds: number | null; revision_policy_status: string } | null = null;
  let revisionsUsed = 0;
  if (scope) {
    const { data } = await supabase.rpc("effective_revision_policy", { p_scope_id: scope.id });
    policy = (Array.isArray(data) ? data[0] : data) ?? null;
    revisionsUsed = (feedback ?? []).filter((f) => f.counts_as_revision).length;
  }

  const role = memberships.find((m) => m.orgId === client.org_id)?.role ?? null;

  return {
    client: client as Client,
    role,
    scope: (scope as FulfillmentScope | null) ?? null,
    policy,
    revisionsUsed,
    templates: (templates ?? []) as { code: string; version: number; name: string }[],
    packages: (packages ?? []) as DeliverablePackage[],
    versions: (versions ?? []) as DeliverableVersion[],
    evidence: (evidence ?? []) as EvidenceItem[],
    feedback: (feedback ?? []) as FeedbackItem[],
    approvals: (approvals ?? []) as ApprovalEvent[],
  };
}
