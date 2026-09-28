import type { AccountStage, MemberRole, PackageStatus } from "./types";

export const STAGE_LABELS: Record<AccountStage, string> = {
  payment_pending: "Payment pending",
  paid: "Paid (not yet contracted)",
  contract_signed: "Contract signed",
  onboarding_booked: "Onboarding booked",
  active: "Active",
  inactive: "Inactive / paused",
  finished: "Finished",
};

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  locked: "Locked: waiting on earlier approval",
  queued: "Queued",
  in_production: "In production",
  internal_qa: "Internal QA",
  client_review: "Client review",
  revision_requested: "Revision requested",
  approved: "Approved with evidence",
};

export const FEEDBACK_CLASSIFICATIONS = [
  ["factual_correction", "Factual correction"],
  ["brand_preference", "Brand preference"],
  ["strategic_suggestion", "Strategic suggestion"],
  ["compliance_issue", "Compliance issue"],
  ["scope_change", "Scope change (owner review)"],
  ["unsupported_claim", "Unsupported claim"],
  ["contradictory_request", "Contradictory request"],
] as const;

export const SCOPE_STATUS_LABELS: Record<string, string> = {
  not_a_revision: "Not counted as a revision",
  within_allowance: "Within included revisions",
  exceeds_allowance: "Exceeds included revisions: needs human decision",
  allowance_unknown: "Allowance unknown: contract review required",
  scope_change_owner_review: "Scope change: owner review",
};

export const PROVENANCE_OPTIONS = [
  ["raw", "Raw source"],
  ["summarized", "Summarized"],
  ["self_reported", "Self-reported by client"],
  ["independently_verified", "Independently verified"],
] as const;

export const canOperate = (role: MemberRole | null) => role === "owner" || role === "admin" || role === "csm";
export const canCommercial = (role: MemberRole | null) => role === "owner" || role === "admin";
