export type MemberRole = "owner" | "admin" | "csm" | "viewer";

export type AccountStage =
  | "payment_pending"
  | "paid"
  | "contract_signed"
  | "onboarding_booked"
  | "active"
  | "inactive"
  | "finished";

export type PackageStatus =
  | "locked"
  | "queued"
  | "in_production"
  | "internal_qa"
  | "client_review"
  | "revision_requested"
  | "approved";

export type Client = {
  id: string;
  org_id: string;
  display_name: string;
  business_name: string | null;
  primary_email: string | null;
  timezone: string | null;
  account_stage: AccountStage;
  inactive_reason: string | null;
  is_internal_test: boolean;
  created_at: string;
};

export type FulfillmentScope = {
  id: string;
  client_id: string;
  template_code: string;
  template_version: number;
  snapshot: { packages: { key: string; title: string; deliverables?: string[]; acceptance?: string[]; quantity?: number }[] };
  included_revision_rounds: number | null;
  revision_policy_status: "contracted" | "unknown_review_required";
  contract_reference: string;
  activated_at: string;
};

export type DeliverablePackage = {
  id: string;
  package_key: string;
  title: string;
  position: number;
  depends_on: string[];
  status: PackageStatus;
  current_version_id: string | null;
  approved_version_id: string | null;
};

export type DeliverableVersion = {
  id: string;
  package_id: string;
  version_number: number;
  artifact_url: string;
  content_sha256: string | null;
  provider: string | null;
  provider_asset_id: string | null;
  notes: string | null;
  created_at: string;
};

export type EvidenceItem = {
  id: string;
  version_id: string;
  kind: "source" | "qa";
  source_provider: string | null;
  source_id: string | null;
  url: string | null;
  source_date: string | null;
  provenance: string | null;
  qa_checklist_version: string | null;
  qa_result: "pass" | "fail" | "waived" | null;
  findings: string | null;
  created_at: string;
};

export type FeedbackItem = {
  id: string;
  version_id: string;
  source_url: string;
  author_label: string;
  received_at: string;
  classification: string;
  requested_changes: string;
  counts_as_revision: boolean;
  revision_round: number | null;
  scope_status: string;
};

export type ApprovalEvent = {
  id: string;
  version_id: string;
  version_number: number;
  content_sha256: string | null;
  provider_asset_id: string | null;
  approver_label: string;
  evidence_url: string;
  created_at: string;
};
