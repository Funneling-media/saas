import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { type Actors, SHA_V1, SHA_V2, asUser, createTestDb, rpc, seedActors, type TestDb } from "./harness.ts";

let db: TestDb;
let a: Actors;

before(async () => {
  db = await createTestDb();
  a = await seedActors(db);
});

after(async () => {
  await db?.drop();
});

// ---------------------------------------------------------------------------
// Helpers that drive the workflow through the same functions the app calls.
// ---------------------------------------------------------------------------

let keyCounter = 0;
const key = (label: string) => `${label}-${++keyCounter}`;

async function newClient(stage: string | null = "contract_signed", org = a.orgA, owner = a.ownerA): Promise<string> {
  const id = await rpc<string>(db, owner, "create_client", [org, `Internal Test Client ${keyCounter}`, "Fixture Co", null, "UTC", true]);
  if (stage) {
    await rpc(db, owner, "set_account_stage", [id, stage, "fixture: signed agreement on file", null]);
  }
  return id;
}

async function activate(clientId: string, rounds: number | null = null, actor = a.ownerA, idem = key("activate")) {
  return rpc<string>(db, actor, "activate_fulfillment", [
    clientId,
    "webinar-engine-v2",
    1,
    "fixture://contracts/internal-test-client",
    rounds,
    "fixture: owner confirmed package",
    idem,
  ]);
}

async function packages(clientId: string) {
  const { rows } = await db.admin.query(
    "select id, package_key, status, current_version_id, approved_version_id from public.deliverable_packages where client_id = $1 order by position",
    [clientId],
  );
  return rows as { id: string; package_key: string; status: string; current_version_id: string | null; approved_version_id: string | null }[];
}

async function submit(pkgId: string, sha = SHA_V1, actor = a.csmA) {
  return rpc<string>(db, actor, "submit_version", [pkgId, "https://drive.example.test/file", sha, "manual-upload", null, "fixture output"]);
}

async function evidence(versionId: string, actor = a.csmA) {
  await rpc(db, actor, "add_source_evidence", [versionId, "fixture", "onboarding-form-1", "https://example.test/source", "2026-09-01", "summarized"]);
  await rpc(db, actor, "record_qa", [versionId, "qa-checklist-v1", "pass", "fixture QA pass"]);
}

/** Takes a queued package to client review with a fresh version. Returns the version id. */
async function toClientReview(pkgId: string, sha = SHA_V1): Promise<string> {
  await rpc(db, a.csmA, "start_package", [pkgId]);
  const v = await submit(pkgId, sha);
  await evidence(v);
  await rpc(db, a.csmA, "send_for_client_review", [pkgId]);
  return v;
}

async function approve(versionId: string, sha: string | null = SHA_V1, actor = a.csmA, idem = key("approve")) {
  return rpc<string>(db, actor, "record_approval", [versionId, sha, null, "Client (fixture) via Loom", "https://loom.example.test/approval", idem]);
}

async function rejects(p: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(p, (e: Error) => {
    assert.match(e.message, pattern);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Fixture journey
// ---------------------------------------------------------------------------

describe("fixture journey: scope snapshot -> version -> evidence -> approval -> reload -> unlock", () => {
  test("approving an exact version persists and unlocks only the next package", async () => {
    const clientId = await newClient();
    const scopeId = await activate(clientId, null);

    // Scope snapshot is immutable and records an unknown revision policy (no assumed default).
    const { rows: scopes } = await db.admin.query("select * from public.fulfillment_scopes where id = $1", [scopeId]);
    assert.equal(scopes[0].template_code, "webinar-engine-v2");
    assert.equal(scopes[0].template_version, 1);
    assert.equal(scopes[0].included_revision_rounds, null);
    assert.equal(scopes[0].revision_policy_status, "unknown_review_required");
    assert.equal(scopes[0].snapshot.packages.length, 9);

    let pkgs = await packages(clientId);
    assert.equal(pkgs.length, 9);
    assert.deepEqual(
      pkgs.map((p) => p.status),
      ["queued", "locked", "locked", "locked", "locked", "locked", "locked", "locked", "locked"],
    );

    const versionId = await toClientReview(pkgs[0].id);
    const approvalId = await approve(versionId);

    // "Reload": read back on a brand-new connection, as the CSM, through RLS.
    const reloaded = await asUser(db, a.csmA, async (c) => {
      const p = await c.query(
        "select package_key, status, approved_version_id from public.deliverable_packages where client_id = $1 order by position",
        [clientId],
      );
      const ap = await c.query("select version_id, version_number, content_sha256, evidence_url from public.approval_events where id = $1", [
        approvalId,
      ]);
      return { pkgs: p.rows, approval: ap.rows[0] };
    });

    assert.equal(reloaded.pkgs[0].status, "approved");
    assert.equal(reloaded.pkgs[0].approved_version_id, versionId);
    assert.equal(reloaded.pkgs[1].status, "queued", "stage 2 unlocks");
    assert.equal(reloaded.pkgs[2].status, "locked", "stage 3 stays locked");
    assert.equal(reloaded.approval.version_id, versionId);
    assert.equal(reloaded.approval.version_number, 1);
    assert.equal(reloaded.approval.content_sha256, SHA_V1);

    // Audit trail covers every step.
    const { rows: audit } = await db.admin.query("select action from public.audit_events where org_id = $1 order by id", [a.orgA]);
    const actions = audit.map((r) => r.action);
    for (const expected of [
      "client.created",
      "client.stage_changed",
      "fulfillment.activated",
      "package.started",
      "version.submitted",
      "evidence.source_added",
      "evidence.qa_recorded",
      "package.sent_for_client_review",
      "version.approved",
    ]) {
      assert.ok(actions.includes(expected), `audit contains ${expected}`);
    }

    pkgs = await packages(clientId);
    await rejects(submit(pkgs[2].id), /cannot submit a version while package is locked/);
  });

  test("a later template version never changes an existing client's snapshot", async () => {
    const clientId = await newClient();
    const scopeId = await activate(clientId);
    await db.admin.query(
      "insert into public.scope_templates (code, version, name, definition) values ('webinar-engine-v2', 99, 'test', '{\"packages\":[{\"key\":\"x\",\"position\":1,\"title\":\"x\",\"depends_on\":[]}]}')",
    );
    const { rows } = await db.admin.query("select template_version, jsonb_array_length(snapshot->'packages') n from public.fulfillment_scopes where id = $1", [
      scopeId,
    ]);
    assert.equal(rows[0].template_version, 1);
    assert.equal(rows[0].n, 9);
  });
});

// ---------------------------------------------------------------------------
// Entitlement gate
// ---------------------------------------------------------------------------

describe("activation gate", () => {
  test("payment without a signed contract cannot activate fulfillment", async () => {
    for (const stage of [null, "paid"]) {
      const clientId = await newClient(stage);
      await rejects(activate(clientId), /requires a signed contract/);
    }
  });

  test("CSM and viewer cannot activate or change commercial stage", async () => {
    const clientId = await newClient();
    await rejects(activate(clientId, null, a.csmA), /not authorized/);
    await rejects(activate(clientId, null, a.viewerA), /not authorized/);
    await rejects(rpc(db, a.csmA, "set_account_stage", [clientId, "active", "csm attempt", null]), /not authorized/);
  });

  test("admin may activate; a client can only be activated once", async () => {
    const clientId = await newClient();
    await activate(clientId, 3, a.adminA);
    await rejects(activate(clientId, 3, a.ownerA), /already has an activated scope/);
  });

  test("duplicate activation with the same idempotency key returns the same scope", async () => {
    const clientId = await newClient();
    const k = key("idem-activate");
    const first = await activate(clientId, null, a.ownerA, k);
    const second = await activate(clientId, null, a.ownerA, k);
    assert.equal(first, second);
    const { rows } = await db.admin.query("select count(*)::int n from public.deliverable_packages where client_id = $1", [clientId]);
    assert.equal(rows[0].n, 9, "no duplicate packages");
  });

  test("activation requires a contract reference", async () => {
    const clientId = await newClient();
    await rejects(
      rpc(db, a.ownerA, "activate_fulfillment", [clientId, "webinar-engine-v2", 1, "  ", null, "reason", key("x")]),
      /contract_reference/,
    );
  });
});

// ---------------------------------------------------------------------------
// Evidence and approval gates
// ---------------------------------------------------------------------------

describe("approval requires exact-version evidence", () => {
  test("cannot send to client review without source evidence, without QA, or after failed QA", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    await rpc(db, a.csmA, "start_package", [p1.id]);
    const v = await submit(p1.id);

    await rejects(rpc(db, a.csmA, "send_for_client_review", [p1.id]), /missing source evidence/);
    await rpc(db, a.csmA, "add_source_evidence", [v, "fixture", null, "https://example.test/s", null, "self_reported"]);
    await rejects(rpc(db, a.csmA, "send_for_client_review", [p1.id]), /missing QA evidence/);
    await rpc(db, a.csmA, "record_qa", [v, "qa-v1", "fail", "wrong logo"]);
    await rejects(rpc(db, a.csmA, "send_for_client_review", [p1.id]), /latest QA for this version failed/);
    await rpc(db, a.csmA, "record_qa", [v, "qa-v1", "pass", "fixed"]);
    await rpc(db, a.csmA, "send_for_client_review", [p1.id]);
  });

  test("evidence on an older version does not count for a newer one", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    await rpc(db, a.csmA, "record_feedback", [v1, "brand_preference", "Use darker navy", "https://docs.example.test/fb", "Client", null, true]);
    await submit(p1.id, SHA_V2);
    await rejects(rpc(db, a.csmA, "send_for_client_review", [p1.id]), /missing source evidence/);
  });

  test("the package stays locked-for-approval until status is client_review", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    await rpc(db, a.csmA, "start_package", [p1.id]);
    const v = await submit(p1.id);
    await evidence(v);
    await rejects(approve(v), /must be in client review/);
  });

  test("a superseded version cannot be approved, and a mismatched hash is rejected", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1, p2] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    await rejects(approve(v1, SHA_V2), /identity does not match/);

    await rpc(db, a.csmA, "record_feedback", [v1, "factual_correction", "Wrong founding year", "https://docs.example.test/fb", "Client", null, true]);
    const v2 = await submit(p1.id, SHA_V2);
    await evidence(v2);
    await rpc(db, a.csmA, "send_for_client_review", [p1.id]);

    await rejects(approve(v1, SHA_V1), /only the version currently in review/);
    await approve(v2, SHA_V2);
    const pkgs = await packages(clientId);
    assert.equal(pkgs[0].approved_version_id, v2);
    assert.equal(pkgs[1].id, p2.id);
    assert.equal(pkgs[1].status, "queued");
  });

  test("duplicate approval events are idempotent and do not double-unlock", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    const v = await toClientReview(p1.id);
    const k = key("idem-approve");
    const first = await approve(v, SHA_V1, a.csmA, k);
    const second = await approve(v, SHA_V1, a.csmA, k);
    assert.equal(first, second);
    const { rows } = await db.admin.query("select count(*)::int n from public.approval_events where package_id = $1", [p1.id]);
    assert.equal(rows[0].n, 1);
    const { rows: audits } = await db.admin.query(
      "select count(*)::int n from public.audit_events where action = 'version.approved' and entity_id = $1",
      [v],
    );
    assert.equal(audits[0].n, 1);
  });

  test("an approval key cannot be replayed against a different version", async () => {
    const c1 = await newClient();
    await activate(c1);
    const c2 = await newClient();
    await activate(c2);
    const v1 = await toClientReview((await packages(c1))[0].id);
    const v2 = await toClientReview((await packages(c2))[0].id);
    const k = key("replay");
    await approve(v1, SHA_V1, a.csmA, k);
    await rejects(approve(v2, SHA_V1, a.csmA, k), /different version/);
  });

  test("CSM cannot waive QA; owner can, with findings", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    await rpc(db, a.csmA, "start_package", [p1.id]);
    const v = await submit(p1.id);
    await rejects(rpc(db, a.csmA, "record_qa", [v, "qa-v1", "waived", "skip"]), /not authorized/);
    await rejects(rpc(db, a.ownerA, "record_qa", [v, "qa-v1", "waived", null]), /qa_shape/);
    await rpc(db, a.ownerA, "record_qa", [v, "qa-v1", "waived", "owner accepted known issue"]);
  });

  test("a version must carry a content hash or provider asset id", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    await rpc(db, a.csmA, "start_package", [p1.id]);
    await rejects(
      rpc(db, a.csmA, "submit_version", [p1.id, "https://drive.example.test/f", null, "manual", null, null]),
      /deliverable_versions_identity/,
    );
  });
});

// ---------------------------------------------------------------------------
// Revision allowance
// ---------------------------------------------------------------------------

describe("revision allowance comes from the contract snapshot", () => {
  async function feedbackRound(pkgId: string, versionId: string, classification = "brand_preference", counts = true) {
    const fid = await rpc<string>(db, a.csmA, "record_feedback", [
      versionId,
      classification,
      "change request",
      "https://docs.example.test/feedback",
      "Client",
      null,
      counts,
    ]);
    const { rows } = await db.admin.query("select revision_round, scope_status, counts_as_revision from public.feedback_items where id = $1", [fid]);
    return rows[0];
  }

  async function resubmit(pkgId: string, sha: string) {
    const v = await submit(pkgId, sha);
    await evidence(v);
    await rpc(db, a.csmA, "send_for_client_review", [pkgId]);
    return v;
  }

  test("unknown policy flags every counted revision as allowance_unknown", async () => {
    const clientId = await newClient();
    await activate(clientId, null);
    const [p1] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    const fb = await feedbackRound(p1.id, v1);
    assert.equal(fb.revision_round, 1);
    assert.equal(fb.scope_status, "allowance_unknown");
  });

  test("contracted allowance of 1: round 1 within, round 2 exceeds (flagged, not blocked)", async () => {
    const clientId = await newClient();
    await activate(clientId, 1);
    const [p1] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    assert.equal((await feedbackRound(p1.id, v1)).scope_status, "within_allowance");
    const v2 = await resubmit(p1.id, SHA_V2);
    const second = await feedbackRound(p1.id, v2);
    assert.equal(second.revision_round, 2);
    assert.equal(second.scope_status, "exceeds_allowance");
    // Work can continue; billing/enforcement is a human decision.
    await resubmit(p1.id, "c".repeat(64));
  });

  test("scope changes never consume an included round and go to owner review", async () => {
    const clientId = await newClient();
    await activate(clientId, 3);
    const [p1] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    const fb = await feedbackRound(p1.id, v1, "scope_change", true);
    assert.equal(fb.counts_as_revision, false);
    assert.equal(fb.revision_round, null);
    assert.equal(fb.scope_status, "scope_change_owner_review");
  });

  test("owner amendment changes the effective allowance; CSM cannot amend", async () => {
    const clientId = await newClient();
    const scopeId = await activate(clientId, null);
    await rejects(rpc(db, a.csmA, "amend_revision_policy", [scopeId, 3, "fixture://contract", "found contract"]), /not authorized/);
    await rejects(rpc(db, a.adminA, "amend_revision_policy", [scopeId, 3, "fixture://contract", "found contract"]), /not authorized/);
    await rpc(db, a.ownerA, "amend_revision_policy", [scopeId, 3, "fixture://contract", "found signed contract"]);
    const policy = await asUser(db, a.csmA, async (c) => (await c.query("select * from public.effective_revision_policy($1)", [scopeId])).rows[0]);
    assert.equal(policy.included_revision_rounds, 3);
    assert.equal(policy.revision_policy_status, "contracted");

    const [p1] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    assert.equal((await feedbackRound(p1.id, v1)).scope_status, "within_allowance");
  });

  test("feedback must target the version currently in client review", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    await rpc(db, a.csmA, "start_package", [p1.id]);
    const v = await submit(p1.id);
    await rejects(
      rpc(db, a.csmA, "record_feedback", [v, "brand_preference", "x", "https://x.test", "Client", null, true]),
      /currently in client review/,
    );
  });
});

// ---------------------------------------------------------------------------
// Roles and tenant isolation
// ---------------------------------------------------------------------------

describe("roles and tenant isolation", () => {
  test("viewer can read but cannot perform any workflow write", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);

    const visible = await asUser(db, a.viewerA, async (c) => (await c.query("select id from public.clients where id = $1", [clientId])).rowCount);
    assert.equal(visible, 1);

    await rejects(rpc(db, a.viewerA, "create_client", [a.orgA, "x", null, null, null, true]), /not authorized/);
    await rejects(rpc(db, a.viewerA, "start_package", [p1.id]), /not authorized/);
    await rpc(db, a.csmA, "start_package", [p1.id]);
    await rejects(submit(p1.id, SHA_V1, a.viewerA), /not authorized/);
    const v = await submit(p1.id);
    await rejects(rpc(db, a.viewerA, "add_source_evidence", [v, "x", null, "https://x.test", null, "raw"]), /not authorized/);
    await rejects(rpc(db, a.viewerA, "record_qa", [v, "qa", "pass", null]), /not authorized/);
    await evidence(v);
    await rpc(db, a.csmA, "send_for_client_review", [p1.id]);
    await rejects(approve(v, SHA_V1, a.viewerA), /not authorized/);
  });

  test("another organization cannot read or act on this organization's data", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);

    const seen = await asUser(db, a.ownerB, async (c) => ({
      clients: (await c.query("select id from public.clients where id = $1", [clientId])).rowCount,
      packages: (await c.query("select id from public.deliverable_packages where client_id = $1", [clientId])).rowCount,
      scopes: (await c.query("select id from public.fulfillment_scopes where client_id = $1", [clientId])).rowCount,
      audit: (await c.query("select id from public.audit_events where org_id = $1", [a.orgA])).rowCount,
    }));
    assert.deepEqual(seen, { clients: 0, packages: 0, scopes: 0, audit: 0 });

    await rejects(rpc(db, a.ownerB, "start_package", [p1.id]), /not authorized/);
    await rejects(rpc(db, a.ownerB, "create_client", [a.orgA, "intruder", null, null, null, false]), /not authorized/);
    await rejects(activate(clientId, null, a.ownerB), /not authorized/);
    await rejects(rpc(db, a.outsider, "set_account_stage", [clientId, "active", "x", null]), /not authorized/);
  });

  test("anonymous callers see nothing and cannot call commands", async () => {
    const clientId = await newClient();
    await assert.rejects(
      asUser(db, null, (c) => c.query("select id from public.clients where id = $1", [clientId]), "anon"),
      /permission denied/,
    );
    await assert.rejects(
      asUser(db, null, (c) => c.query("select public.create_client($1, 'x')", [a.orgA]), "anon"),
      /permission denied/,
    );
  });

  test("authenticated users cannot write tables directly, bypassing the commands", async () => {
    const clientId = await newClient();
    await activate(clientId);
    const [p1] = await packages(clientId);
    await assert.rejects(
      asUser(db, a.ownerA, (c) => c.query("update public.deliverable_packages set status = 'approved' where id = $1", [p1.id])),
      /permission denied/,
    );
    await assert.rejects(
      asUser(db, a.ownerA, (c) =>
        c.query(
          "insert into public.approval_events (org_id, package_id, version_id, version_number, approver_label, evidence_url, idempotency_key, recorded_by) values ($1, $2, $2, 1, 'x', 'x', 'x', $3)",
          [a.orgA, p1.id, a.ownerA],
        ),
      ),
      /permission denied/,
    );
  });

  test("CSM cannot read the audit log directly; owner can", async () => {
    await newClient();
    const csm = await asUser(db, a.csmA, async (c) => (await c.query("select id from public.audit_events")).rowCount);
    const owner = await asUser(db, a.ownerA, async (c) => (await c.query("select id from public.audit_events")).rowCount);
    assert.equal(csm, 0);
    assert.ok((owner ?? 0) > 0);
  });
});

// ---------------------------------------------------------------------------
// Immutability (even for privileged database sessions)
// ---------------------------------------------------------------------------

describe("append-only records", () => {
  test("scopes, amendments, versions, evidence, feedback, approvals, templates and audit rows cannot be edited or deleted", async () => {
    const clientId = await newClient();
    const scopeId = await activate(clientId, null);
    const [p1] = await packages(clientId);
    const v1 = await toClientReview(p1.id);
    await rpc(db, a.csmA, "record_feedback", [v1, "factual_correction", "fix date", "https://docs.example.test/fb", "Client", null, true]);
    await rpc(db, a.ownerA, "amend_revision_policy", [scopeId, 2, "fixture://contract", "contract located"]);
    const v2 = await submit(p1.id, SHA_V2);
    await evidence(v2);
    await rpc(db, a.csmA, "send_for_client_review", [p1.id]);
    await approve(v2, SHA_V2);

    const tables: Record<string, string> = {
      fulfillment_scopes: "activated_at",
      scope_amendments: "amended_at",
      deliverable_versions: "created_at",
      evidence_items: "created_at",
      feedback_items: "created_at",
      approval_events: "created_at",
      audit_events: "created_at",
      scope_templates: "created_at",
    };
    for (const [table, column] of Object.entries(tables)) {
      const { rows } = await db.admin.query(`select count(*)::int n from public.${table}`);
      assert.ok(rows[0].n > 0, `${table} has rows to protect`);
      await rejects(db.admin.query(`update public.${table} set ${column} = ${column}`), /append-only/);
      await rejects(db.admin.query(`delete from public.${table}`), /append-only/);
    }
  });
});
