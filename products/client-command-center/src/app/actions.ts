"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RpcArgs = Record<string, unknown>;

const text = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

const uuid = z.string().uuid();
const httpUrl = z.string().url().refine((u) => /^https?:\/\//.test(u), "must be an http(s) URL");
const sha256 = z.string().regex(/^[0-9a-f]{64}$/i, "must be a 64-character SHA-256 hex digest");

function backTo(path: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${path}?${qs}`);
}

/**
 * Calls a database command as the signed-in user. Authorization and every workflow
 * rule are enforced in Postgres; this layer only validates input shape.
 */
async function call(fn: string, args: RpcArgs, path: string, success: string): Promise<never> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) backTo("/setup", {});
  const { error } = await supabase.rpc(fn, args);
  if (error) backTo(path, { error: error.message });
  revalidatePath(path);
  backTo(path, { ok: success });
}

function parse<T>(schema: z.ZodType<T>, value: unknown, path: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    backTo(path, { error: result.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") });
  }
  return result.data;
}

export async function createClientAction(fd: FormData) {
  const input = parse(
    z.object({
      org: uuid,
      name: z.string().min(1),
      business: z.string().nullable(),
      email: z.string().email().nullable(),
      timezone: z.string().nullable(),
    }),
    { org: text(fd, "org"), name: text(fd, "name"), business: text(fd, "business"), email: text(fd, "email"), timezone: text(fd, "timezone") },
    "/clients/new",
  );
  if (input.timezone && !Intl.supportedValuesOf("timeZone").includes(input.timezone)) {
    backTo("/clients/new", { error: `Unknown IANA timezone: ${input.timezone}` });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) backTo("/setup", {});
  const { data, error } = await supabase.rpc("create_client", {
    p_org_id: input.org,
    p_display_name: input.name,
    p_business_name: input.business,
    p_primary_email: input.email,
    p_timezone: input.timezone,
    p_is_internal_test: fd.get("internal_test") === "on",
  });
  if (error) backTo("/clients/new", { error: error.message });
  revalidatePath("/");
  redirect(`/clients/${data as string}`);
}

export async function setStageAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const input = parse(
    z.object({
      stage: z.enum(["payment_pending", "paid", "contract_signed", "onboarding_booked", "active", "inactive", "finished"]),
      reason: z.string().min(3, "explain the change"),
      inactiveReason: z.string().nullable(),
    }),
    { stage: text(fd, "stage"), reason: text(fd, "reason"), inactiveReason: text(fd, "inactive_reason") },
    path,
  );
  await call("set_account_stage", { p_client_id: clientId, p_stage: input.stage, p_reason: input.reason, p_inactive_reason: input.inactiveReason }, path, "Stage updated");
}

export async function activateAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const roundsRaw = text(fd, "rounds");
  const input = parse(
    z.object({
      template: z.string().regex(/^[a-z0-9-]+@\d+$/),
      contract: z.string().min(3, "reference the signed agreement"),
      rounds: z.number().int().min(0).nullable(),
      reason: z.string().min(3),
      idem: uuid,
    }),
    {
      template: text(fd, "template"),
      contract: text(fd, "contract_reference"),
      rounds: roundsRaw === null ? null : Number(roundsRaw),
      reason: text(fd, "reason"),
      idem: text(fd, "idempotency_key"),
    },
    path,
  );
  const [code, version] = input.template.split("@");
  await call(
    "activate_fulfillment",
    {
      p_client_id: clientId,
      p_template_code: code,
      p_template_version: Number(version),
      p_contract_reference: input.contract,
      p_included_revision_rounds: input.rounds,
      p_reason: input.reason,
      p_idempotency_key: input.idem,
    },
    path,
    "Fulfillment activated with a scope snapshot",
  );
}

export async function amendPolicyAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const roundsRaw = text(fd, "rounds");
  const input = parse(
    z.object({ scope: uuid, rounds: z.number().int().min(0).nullable(), contract: z.string().min(3), reason: z.string().min(3) }),
    { scope: text(fd, "scope_id"), rounds: roundsRaw === null ? null : Number(roundsRaw), contract: text(fd, "contract_reference"), reason: text(fd, "reason") },
    path,
  );
  await call(
    "amend_revision_policy",
    { p_scope_id: input.scope, p_included_revision_rounds: input.rounds, p_contract_reference: input.contract, p_reason: input.reason },
    path,
    "Revision policy amended",
  );
}

export async function startPackageAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const pkg = parse(uuid, text(fd, "package_id"), `/clients/${clientId}`);
  await call("start_package", { p_package_id: pkg }, `/clients/${clientId}`, "Production started");
}

export async function submitVersionAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const input = parse(
    z
      .object({
        pkg: uuid,
        url: httpUrl,
        sha: sha256.nullable(),
        provider: z.string().nullable(),
        assetId: z.string().nullable(),
        notes: z.string().nullable(),
      })
      .refine((v) => v.sha || v.assetId, "provide a SHA-256 or a provider asset ID"),
    {
      pkg: text(fd, "package_id"),
      url: text(fd, "artifact_url"),
      sha: text(fd, "content_sha256")?.toLowerCase() ?? null,
      provider: text(fd, "provider"),
      assetId: text(fd, "provider_asset_id"),
      notes: text(fd, "notes"),
    },
    path,
  );
  await call(
    "submit_version",
    { p_package_id: input.pkg, p_artifact_url: input.url, p_content_sha256: input.sha, p_provider: input.provider, p_provider_asset_id: input.assetId, p_notes: input.notes },
    path,
    "Version submitted for internal QA",
  );
}

export async function addSourceAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const input = parse(
    z
      .object({
        version: uuid,
        provider: z.string().nullable(),
        sourceId: z.string().nullable(),
        url: httpUrl.nullable(),
        date: z.string().date().nullable(),
        provenance: z.enum(["raw", "summarized", "self_reported", "independently_verified"]),
      })
      .refine((v) => v.url || v.sourceId, "provide a URL or a source ID"),
    {
      version: text(fd, "version_id"),
      provider: text(fd, "source_provider"),
      sourceId: text(fd, "source_id"),
      url: text(fd, "url"),
      date: text(fd, "source_date"),
      provenance: text(fd, "provenance"),
    },
    path,
  );
  await call(
    "add_source_evidence",
    { p_version_id: input.version, p_source_provider: input.provider, p_source_id: input.sourceId, p_url: input.url, p_source_date: input.date, p_provenance: input.provenance },
    path,
    "Source evidence attached",
  );
}

export async function recordQaAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const input = parse(
    z.object({ version: uuid, checklist: z.string().min(1), result: z.enum(["pass", "fail", "waived"]), findings: z.string().nullable() }),
    { version: text(fd, "version_id"), checklist: text(fd, "checklist_version"), result: text(fd, "result"), findings: text(fd, "findings") },
    path,
  );
  await call(
    "record_qa",
    { p_version_id: input.version, p_checklist_version: input.checklist, p_result: input.result, p_findings: input.findings },
    path,
    "QA recorded",
  );
}

export async function sendForReviewAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const pkg = parse(uuid, text(fd, "package_id"), `/clients/${clientId}`);
  await call("send_for_client_review", { p_package_id: pkg }, `/clients/${clientId}`, "Marked as in client review (no message was sent)");
}

export async function recordFeedbackAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const input = parse(
    z.object({
      version: uuid,
      classification: z.enum([
        "factual_correction",
        "brand_preference",
        "strategic_suggestion",
        "compliance_issue",
        "scope_change",
        "unsupported_claim",
        "contradictory_request",
      ]),
      changes: z.string().min(3),
      sourceUrl: httpUrl,
      author: z.string().min(1),
      receivedAt: z.string().datetime({ local: true }).nullable(),
    }),
    {
      version: text(fd, "version_id"),
      classification: text(fd, "classification"),
      changes: text(fd, "requested_changes"),
      sourceUrl: text(fd, "source_url"),
      author: text(fd, "author_label"),
      receivedAt: text(fd, "received_at"),
    },
    path,
  );
  await call(
    "record_feedback",
    {
      p_version_id: input.version,
      p_classification: input.classification,
      p_requested_changes: input.changes,
      p_source_url: input.sourceUrl,
      p_author_label: input.author,
      // datetime-local has no zone; the form labels it as UTC.
      p_received_at: input.receivedAt ? `${input.receivedAt}Z` : null,
      p_counts_as_revision: fd.get("counts_as_revision") === "on",
    },
    path,
    "Feedback recorded",
  );
}

export async function recordApprovalAction(fd: FormData) {
  const clientId = parse(uuid, text(fd, "client_id"), "/");
  const path = `/clients/${clientId}`;
  const input = parse(
    z.object({
      version: uuid,
      sha: z.string().nullable(),
      assetId: z.string().nullable(),
      approver: z.string().min(1),
      evidenceUrl: httpUrl,
      idem: uuid,
    }),
    {
      version: text(fd, "version_id"),
      sha: text(fd, "expected_sha256"),
      assetId: text(fd, "expected_provider_asset_id"),
      approver: text(fd, "approver_label"),
      evidenceUrl: text(fd, "evidence_url"),
      idem: text(fd, "idempotency_key"),
    },
    path,
  );
  await call(
    "record_approval",
    {
      p_version_id: input.version,
      p_expected_sha256: input.sha,
      p_expected_provider_asset_id: input.assetId,
      p_approver_label: input.approver,
      p_evidence_url: input.evidenceUrl,
      p_idempotency_key: input.idem,
    },
    path,
    "Approval recorded for this exact version",
  );
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/login");
}
