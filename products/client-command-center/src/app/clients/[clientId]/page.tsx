import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  activateAction,
  addSourceAction,
  amendPolicyAction,
  recordApprovalAction,
  recordFeedbackAction,
  recordQaAction,
  sendForReviewAction,
  setStageAction,
  startPackageAction,
  submitVersionAction,
} from "@/app/actions";
import { Badge, Button, Card, Disclosure, Field, Flash, Select } from "@/components/ui";
import { loadClientWorkspace } from "@/lib/data";
import {
  FEEDBACK_CLASSIFICATIONS,
  PACKAGE_STATUS_LABELS,
  PROVENANCE_OPTIONS,
  SCOPE_STATUS_LABELS,
  STAGE_LABELS,
  canCommercial,
  canOperate,
} from "@/lib/labels";
import type { DeliverablePackage, PackageStatus } from "@/lib/types";

const STATUS_TONE: Record<PackageStatus, "neutral" | "good" | "warn" | "bad" | "info"> = {
  locked: "neutral",
  queued: "info",
  in_production: "info",
  internal_qa: "warn",
  client_review: "warn",
  revision_requested: "bad",
  approved: "good",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  const sp = await searchParams;
  if (!uuidPattern.test(clientId)) notFound();
  const ws = await loadClientWorkspace(clientId);
  if (!ws) notFound();

  const { client, role, scope, policy } = ws;
  const hidden = <input type="hidden" name="client_id" value={client.id} />;
  const op = canOperate(role);
  const commercial = canCommercial(role);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm text-blue-800 hover:underline">
          ← Clients
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {client.display_name} {client.is_internal_test && <Badge tone="info">Internal test</Badge>}
        </h1>
        <p className="text-sm text-slate-600">
          {[client.business_name, client.primary_email, client.timezone].filter(Boolean).join(" · ") || "No business details recorded"}
          {" · "}Your role: <strong>{role ?? "none"}</strong>
        </p>
      </div>

      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />

      <Card title="Account stage">
        <p className="text-sm">
          <strong>{STAGE_LABELS[client.account_stage]}</strong>
          {client.inactive_reason && <> · Reason: {client.inactive_reason}</>}
        </p>
        {commercial && (
          <div className="mt-3">
            <Disclosure summary="Change stage (owner/admin, audited)">
              <form action={setStageAction} className="grid gap-3 sm:grid-cols-2">
                {hidden}
                <Select
                  label="New stage"
                  name="stage"
                  required
                  defaultValue={client.account_stage}
                  options={Object.entries(STAGE_LABELS) as [string, string][]}
                />
                <Field label="Reason / evidence" name="reason" required hint="e.g. signed agreement link or payment record ID" />
                <Field label="Inactive reason (required for Inactive)" name="inactive_reason" hint="e.g. paused at client request until 2026-11-01" />
                <div className="sm:col-span-2">
                  <Button tone="secondary">Save stage</Button>
                </div>
              </form>
            </Disclosure>
          </div>
        )}
      </Card>

      {!scope ? (
        <Card title="Fulfillment scope">
          <p className="text-sm">
            <Badge>Not activated</Badge> No scope has been approved for this client. Payment alone never activates fulfillment.
          </p>
          {commercial ? (
            <form action={activateAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              {hidden}
              <input type="hidden" name="idempotency_key" value={randomUUID()} />
              <Select
                label="Scope template"
                name="template"
                required
                options={ws.templates.map((t) => [`${t.code}@${t.version}`, `${t.name} (${t.code} v${t.version})`] as const)}
              />
              <Field label="Signed agreement reference" name="contract_reference" required hint="Link or document ID of the signed contract" />
              <Field
                label="Included revision rounds (from the contract)"
                name="rounds"
                type="number"
                hint="Leave blank if the contract is silent or unavailable: the policy is stored as unknown / review required."
              />
              <Field label="Activation reason" name="reason" required hint="Who confirmed the package, and how" />
              <p className="text-xs text-slate-600 sm:col-span-2">
                Requires stage Contract signed, Onboarding booked or Active. The template is copied into an immutable snapshot for this
                client; later template changes never alter it.
              </p>
              <div className="sm:col-span-2">
                <Button>Activate fulfillment</Button>
              </div>
            </form>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Only an owner or admin can activate fulfillment.</p>
          )}
        </Card>
      ) : (
        <Card title="Fulfillment scope (snapshot)">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-600">Template</dt>
              <dd>
                {scope.template_code} v{scope.template_version}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Contract reference</dt>
              <dd className="break-all">{scope.contract_reference}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Included revision rounds</dt>
              <dd>
                {policy?.revision_policy_status === "contracted" ? (
                  <>
                    {policy.included_revision_rounds} included · {ws.revisionsUsed} used
                    {ws.revisionsUsed > (policy.included_revision_rounds ?? 0) && (
                      <>
                        {" "}
                        <Badge tone="bad">Over allowance: human decision needed</Badge>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Badge tone="warn">Unknown: contract review required</Badge> · {ws.revisionsUsed} counted so far
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Activated</dt>
              <dd>{new Date(scope.activated_at).toUTCString()}</dd>
            </div>
          </dl>
          {role === "owner" && (
            <div className="mt-3">
              <Disclosure summary="Amend revision policy (owner only, audited)">
                <form action={amendPolicyAction} className="grid gap-3 sm:grid-cols-2">
                  {hidden}
                  <input type="hidden" name="scope_id" value={scope.id} />
                  <Field label="Included revision rounds" name="rounds" type="number" hint="Blank = unknown / review required" />
                  <Field label="Contract reference" name="contract_reference" required />
                  <Field label="Reason" name="reason" required />
                  <div className="sm:col-span-2">
                    <Button tone="secondary">Record amendment</Button>
                  </div>
                </form>
              </Disclosure>
            </div>
          )}
        </Card>
      )}

      {ws.packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} ws={ws} op={op} hidden={hidden} />
      ))}
    </div>
  );
}

type Workspace = NonNullable<Awaited<ReturnType<typeof loadClientWorkspace>>>;

function PackageCard({ pkg, ws, op, hidden }: { pkg: DeliverablePackage; ws: Workspace; op: boolean; hidden: React.ReactNode }) {
  const versions = ws.versions.filter((v) => v.package_id === pkg.id);
  const current = versions.find((v) => v.id === pkg.current_version_id) ?? null;
  const spec = ws.scope?.snapshot.packages.find((p) => p.key === pkg.package_key);
  const pkgHidden = (
    <>
      {hidden}
      <input type="hidden" name="package_id" value={pkg.id} />
    </>
  );

  return (
    <Card
      title={
        <>
          {pkg.position}. {pkg.title}
          {spec?.quantity ? <span className="font-normal text-slate-600"> ({spec.quantity})</span> : null}
        </>
      }
      actions={<Badge tone={STATUS_TONE[pkg.status]}>{PACKAGE_STATUS_LABELS[pkg.status]}</Badge>}
    >
      {spec?.deliverables && (
        <details className="mb-3 text-sm">
          <summary className="cursor-pointer text-slate-700">Scope for this package</summary>
          <ul className="mt-2 list-disc pl-5">
            {spec.deliverables.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {spec.acceptance && <p className="mt-2 text-xs text-slate-600">Acceptance: {spec.acceptance.join("; ")}</p>}
        </details>
      )}
      {pkg.depends_on.length > 0 && pkg.status === "locked" && (
        <p className="text-sm text-slate-600">Unlocks when {pkg.depends_on.join(", ")} has version-specific approval evidence.</p>
      )}

      {op && pkg.status === "queued" && (
        <form action={startPackageAction}>
          {pkgHidden}
          <Button>Start production</Button>
        </form>
      )}

      {op && (pkg.status === "in_production" || pkg.status === "revision_requested") && (
        <Disclosure summary={pkg.status === "revision_requested" ? "Submit revised version" : "Submit version"}>
          <form action={submitVersionAction} className="grid gap-3 sm:grid-cols-2">
            {pkgHidden}
            <Field label="Artifact URL" name="artifact_url" type="url" required />
            <Field label="SHA-256 of the file" name="content_sha256" hint="Run `shasum -a 256 file` locally. Required unless a provider asset ID is given." />
            <Field label="Provider" name="provider" placeholder="google-drive, canva, manual-upload" />
            <Field label="Provider asset ID" name="provider_asset_id" hint="e.g. Drive file ID + revision, Canva design ID" />
            <Field label="Notes" name="notes" />
            <div className="sm:col-span-2">
              <Button>Submit version for internal QA</Button>
            </div>
          </form>
        </Disclosure>
      )}

      {versions.length > 0 && (
        <ol className="mt-3 space-y-3">
          {versions.map((v) => {
            const isCurrent = v.id === pkg.current_version_id;
            const ev = ws.evidence.filter((e) => e.version_id === v.id);
            const fb = ws.feedback.filter((f) => f.version_id === v.id);
            const ap = ws.approvals.filter((a) => a.version_id === v.id);
            return (
              <li key={v.id} className={`rounded border p-3 text-sm ${isCurrent ? "border-slate-400" : "border-slate-200 opacity-80"}`}>
                <p className="font-medium">
                  Version {v.version_number} {isCurrent && <Badge tone="info">Current</Badge>}{" "}
                  {pkg.approved_version_id === v.id && <Badge tone="good">Approved version</Badge>}
                </p>
                <p className="break-all">
                  <a href={v.artifact_url} className="text-blue-800 hover:underline" rel="noreferrer noopener" target="_blank">
                    {v.artifact_url}
                  </a>
                </p>
                <p className="break-all font-mono text-xs text-slate-600">
                  {v.content_sha256 && <>sha256 {v.content_sha256} </>}
                  {v.provider_asset_id && <>· {v.provider}:{v.provider_asset_id}</>}
                </p>

                {ev.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ev.map((e) => (
                      <li key={e.id}>
                        {e.kind === "source" ? (
                          <>
                            <Badge>Source</Badge> {e.source_provider ?? "source"} · {e.provenance?.replace("_", " ")}{" "}
                            {e.url && (
                              <a href={e.url} className="break-all text-blue-800 hover:underline" rel="noreferrer noopener" target="_blank">
                                {e.url}
                              </a>
                            )}
                            {e.source_id && <> · id {e.source_id}</>}
                          </>
                        ) : (
                          <>
                            <Badge tone={e.qa_result === "fail" ? "bad" : e.qa_result === "waived" ? "warn" : "good"}>QA {e.qa_result}</Badge>{" "}
                            checklist {e.qa_checklist_version}
                            {e.findings && <> · {e.findings}</>}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {fb.map((f) => (
                  <div key={f.id} className="mt-2 rounded bg-amber-50 p-2">
                    <p>
                      <Badge tone="warn">{f.classification.replaceAll("_", " ")}</Badge> from {f.author_label}
                      {f.revision_round && <> · revision round {f.revision_round}</>} · {SCOPE_STATUS_LABELS[f.scope_status]}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{f.requested_changes}</p>
                    <a href={f.source_url} className="break-all text-xs text-blue-800 hover:underline" rel="noreferrer noopener" target="_blank">
                      {f.source_url}
                    </a>
                  </div>
                ))}

                {ap.map((a) => (
                  <p key={a.id} className="mt-2 rounded bg-green-50 p-2">
                    <Badge tone="good">Approved</Badge> by {a.approver_label} on {new Date(a.created_at).toUTCString()} ·{" "}
                    <a href={a.evidence_url} className="break-all text-blue-800 hover:underline" rel="noreferrer noopener" target="_blank">
                      evidence
                    </a>
                  </p>
                ))}

                {op && isCurrent && pkg.status !== "approved" && (
                  <div className="mt-3 grid gap-2">
                    {(pkg.status === "internal_qa" || pkg.status === "client_review") && (
                      <>
                        <Disclosure summary="Attach source evidence">
                          <form action={addSourceAction} className="grid gap-3 sm:grid-cols-2">
                            {hidden}
                            <input type="hidden" name="version_id" value={v.id} />
                            <Field label="Source provider" name="source_provider" placeholder="onboarding-form, fathom, wispr, drive" />
                            <Field label="Source URL" name="url" type="url" />
                            <Field label="Source ID" name="source_id" hint="Required if no URL" />
                            <Field label="Source date" name="source_date" type="date" />
                            <Select label="Provenance" name="provenance" required options={PROVENANCE_OPTIONS} />
                            <div className="sm:col-span-2">
                              <Button tone="secondary">Attach source</Button>
                            </div>
                          </form>
                        </Disclosure>
                        <Disclosure summary="Record internal QA">
                          <form action={recordQaAction} className="grid gap-3 sm:grid-cols-2">
                            {hidden}
                            <input type="hidden" name="version_id" value={v.id} />
                            <Field label="Checklist version" name="checklist_version" required defaultValue="qa-checklist-v1" />
                            <Select
                              label="Result"
                              name="result"
                              required
                              options={[
                                ["pass", "Pass"],
                                ["fail", "Fail"],
                                ["waived", "Waived (owner/admin, findings required)"],
                              ]}
                            />
                            <Field label="Findings" name="findings" />
                            <div className="sm:col-span-2">
                              <Button tone="secondary">Record QA</Button>
                            </div>
                          </form>
                        </Disclosure>
                      </>
                    )}
                    {pkg.status === "internal_qa" && (
                      <form action={sendForReviewAction}>
                        {pkgHidden}
                        <Button>Mark ready for client review</Button>
                        <span className="ml-2 text-xs text-slate-600">Records state only. Nothing is sent to the client.</span>
                      </form>
                    )}
                    {pkg.status === "client_review" && (
                      <>
                        <Disclosure summary="Record client approval of this exact version">
                          <form action={recordApprovalAction} className="grid gap-3 sm:grid-cols-2">
                            {hidden}
                            <input type="hidden" name="version_id" value={v.id} />
                            <input type="hidden" name="expected_sha256" value={v.content_sha256 ?? ""} />
                            <input type="hidden" name="expected_provider_asset_id" value={v.provider_asset_id ?? ""} />
                            <input type="hidden" name="idempotency_key" value={randomUUID()} />
                            <Field label="Approved by (client person)" name="approver_label" required />
                            <Field label="Approval evidence URL" name="evidence_url" type="url" required hint="Loom, email, form response or doc comment" />
                            <p className="text-xs text-slate-600 sm:col-span-2">
                              Approval is bound to version {v.version_number}
                              {v.content_sha256 ? ` (sha256 ${v.content_sha256.slice(0, 12)}…)` : ""}. It unlocks the next package; it does not
                              publish, send, bill or change scope.
                            </p>
                            <div className="sm:col-span-2">
                              <Button>Record approval</Button>
                            </div>
                          </form>
                        </Disclosure>
                        <Disclosure summary="Record revision request">
                          <form action={recordFeedbackAction} className="grid gap-3 sm:grid-cols-2">
                            {hidden}
                            <input type="hidden" name="version_id" value={v.id} />
                            <Select label="Classification" name="classification" required options={FEEDBACK_CLASSIFICATIONS} />
                            <Field label="Feedback source URL" name="source_url" type="url" required hint="Loom, Google Doc or form" />
                            <Field label="From" name="author_label" required />
                            <Field label="Received at (UTC)" name="received_at" type="datetime-local" />
                            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                              <span className="font-medium">Exact requested changes *</span>
                              <textarea name="requested_changes" required rows={3} className="rounded border border-slate-300 px-2 py-1.5" />
                            </label>
                            <label className="flex items-center gap-2 text-sm sm:col-span-2">
                              <input type="checkbox" name="counts_as_revision" defaultChecked />
                              Counts as a revision round (scope changes never count; they go to owner review)
                            </label>
                            <div className="sm:col-span-2">
                              <Button tone="secondary">Record feedback</Button>
                            </div>
                          </form>
                        </Disclosure>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!current && pkg.status !== "locked" && pkg.status !== "queued" && <p className="text-sm text-slate-600">No versions yet.</p>}
    </Card>
  );
}
