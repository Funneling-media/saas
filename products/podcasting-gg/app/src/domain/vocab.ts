import { z } from "zod";

/**
 * Canonical vocabularies for Podcasting.gg.
 *
 * These tuples MUST mirror the Postgres enums 1:1 (same values, same order).
 * If you change one here, ship a migration that changes the SQL enum too.
 */

// ---------------------------------------------------------------------------
// Org roles
// ---------------------------------------------------------------------------

/** Ordered by power, descending. */
export const orgRoles = ["owner", "admin", "member", "viewer"] as const;
export type OrgRole = (typeof orgRoles)[number];
export const OrgRoleSchema = z.enum(orgRoles);
export const orgRoleLabel: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

// ---------------------------------------------------------------------------
// Guest pipeline stages
// ---------------------------------------------------------------------------

export const guestStages = [
  "prospect",
  "researched",
  "approved",
  "ready_to_contact",
  "contacted",
  "replied",
  "interested",
  "booking",
  "booked",
  "preparation",
  "recorded",
  "production",
  "published",
  "follow_up",
  "relationship",
] as const;
export type GuestStage = (typeof guestStages)[number];
export const GuestStageSchema = z.enum(guestStages);
export const guestStageLabel: Record<GuestStage, string> = {
  prospect: "Prospect",
  researched: "Researched",
  approved: "Approved",
  ready_to_contact: "Ready to contact",
  contacted: "Contacted",
  replied: "Replied",
  interested: "Interested",
  booking: "Booking",
  booked: "Booked",
  preparation: "Preparation",
  recorded: "Recorded",
  production: "Production",
  published: "Published",
  follow_up: "Follow-up",
  relationship: "Relationship",
};
export const guestStageHint: Record<GuestStage, string> = {
  prospect: "Add a few details and run research to decide if this guest is worth pursuing.",
  researched: "Review the research brief and approve or pass on this guest.",
  approved: "Draft a personalized outreach message and mark them ready to contact.",
  ready_to_contact: "Send the outreach message and log it here.",
  contacted: "Wait for a reply; schedule a follow-up nudge if you hear nothing in a week.",
  replied: "Read their reply and gauge interest; answer any questions they raised.",
  interested: "Propose recording times and share the guest one-pager.",
  booking: "Confirm a date, send the calendar invite and recording link.",
  booked: "Prepare the interview brief and confirm consent/release details.",
  preparation: "Finalize questions and hooks; send the guest a prep note.",
  recorded: "Hand the recording to production and capture any opportunities you heard.",
  production: "Edit, review and approve the episode assets.",
  published: "Send the guest their sharing kit and thank them.",
  follow_up: "Complete the post-episode follow-up: intros, shares, next steps.",
  relationship: "Keep the relationship warm with periodic check-ins and value adds.",
};

// ---------------------------------------------------------------------------
// Episode statuses
// ---------------------------------------------------------------------------

export const episodeStatuses = [
  "idea",
  "research",
  "booked",
  "preparation",
  "recording",
  "editing",
  "review",
  "approval",
  "publishing",
  "repurposing",
  "distribution",
  "follow_up",
  "complete",
] as const;
export type EpisodeStatus = (typeof episodeStatuses)[number];
export const EpisodeStatusSchema = z.enum(episodeStatuses);
export const episodeStatusLabel: Record<EpisodeStatus, string> = {
  idea: "Idea",
  research: "Research",
  booked: "Guest booked",
  preparation: "Preparation",
  recording: "Recording",
  editing: "Editing",
  review: "Review",
  approval: "Approval",
  publishing: "Publishing",
  repurposing: "Repurposing",
  distribution: "Distribution",
  follow_up: "Follow-up",
  complete: "Complete",
};
export const episodeStatusHint: Record<EpisodeStatus, string> = {
  idea: "Capture the angle and the ideal guest, then move to research.",
  research: "Research the topic and guest; build the angle and key questions.",
  booked: "Guest is confirmed; schedule recording and prepare the brief.",
  preparation: "Finalize questions, hooks and logistics for the recording.",
  recording: "Record the episode and store the recording URL.",
  editing: "Edit the long-form episode and produce the audio master.",
  review: "Review the edit, title, show notes and thumbnail.",
  approval: "Get final sign-off on the episode before publishing.",
  publishing: "Publish the long-form episode and audio to your hosts.",
  repurposing: "Generate clips, quotes and social posts from the transcript.",
  distribution: "Push assets to every destination and update the feed.",
  follow_up: "Thank the guest, send the sharing kit and act on opportunities.",
  complete: "Episode is done. Check the completion checklist for anything missed.",
};

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export const opportunityTypes = [
  "sales",
  "referral",
  "introduction",
  "partnership",
  "sponsorship",
  "speaking",
  "hiring",
  "investment",
  "collaboration",
  "media",
  "content",
  "other",
] as const;
export type OpportunityType = (typeof opportunityTypes)[number];
export const OpportunityTypeSchema = z.enum(opportunityTypes);
export const opportunityTypeLabel: Record<OpportunityType, string> = {
  sales: "Sales",
  referral: "Referral",
  introduction: "Introduction",
  partnership: "Partnership",
  sponsorship: "Sponsorship",
  speaking: "Speaking",
  hiring: "Hiring",
  investment: "Investment",
  collaboration: "Collaboration",
  media: "Media",
  content: "Content",
  other: "Other",
};

export const opportunityStatuses = [
  "detected",
  "accepted",
  "in_progress",
  "won",
  "lost",
  "dismissed",
] as const;
export type OpportunityStatus = (typeof opportunityStatuses)[number];
export const OpportunityStatusSchema = z.enum(opportunityStatuses);
export const opportunityStatusLabel: Record<OpportunityStatus, string> = {
  detected: "Detected",
  accepted: "Accepted",
  in_progress: "In progress",
  won: "Won",
  lost: "Lost",
  dismissed: "Dismissed",
};
export const opportunityStatusHint: Record<OpportunityStatus, string> = {
  detected: "Review the evidence and accept, edit or dismiss this opportunity.",
  accepted: "Convert it into a task and decide the first next action.",
  in_progress: "Work the next action and log progress as you go.",
  won: "Record the outcome and value so it counts toward business impact.",
  lost: "Note why it didn't land so future outreach improves.",
  dismissed: "Dismissed opportunities are kept for transparency; nothing to do.",
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const taskStatuses = ["todo", "in_progress", "done", "cancelled"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const TaskStatusSchema = z.enum(taskStatuses);
export const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};
export const taskStatusHint: Record<TaskStatus, string> = {
  todo: "Pick the highest-value task and start it.",
  in_progress: "Finish what you started before opening new work.",
  done: "Nothing left here. Completed tasks feed your progress metrics.",
  cancelled: "Cancelled tasks are kept for history only.",
};

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof taskPriorities)[number];
export const TaskPrioritySchema = z.enum(taskPriorities);
export const taskPriorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export const approvalStatuses = ["pending", "approved", "rejected", "changes_requested"] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];
export const ApprovalStatusSchema = z.enum(approvalStatuses);
export const approvalStatusLabel: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
};
export const approvalStatusHint: Record<ApprovalStatus, string> = {
  pending: "Review the item and approve, reject or request changes.",
  approved: "Approved items proceed automatically; nothing to do.",
  rejected: "Rejected items stop here. Create a new draft if still needed.",
  changes_requested: "Apply the requested changes and resubmit for approval.",
};

// ---------------------------------------------------------------------------
// Background jobs
// ---------------------------------------------------------------------------

export const jobStatuses = [
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "retrying",
  "cancelled",
] as const;
export type JobStatus = (typeof jobStatuses)[number];
export const JobStatusSchema = z.enum(jobStatuses);
export const jobStatusLabel: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  waiting: "Waiting",
  completed: "Completed",
  failed: "Failed",
  retrying: "Retrying",
  cancelled: "Cancelled",
};
export const jobStatusHint: Record<JobStatus, string> = {
  queued: "Waiting for a worker to pick it up.",
  running: "In progress; check back shortly.",
  waiting: "Paused until an external provider or dependency responds.",
  completed: "Finished successfully.",
  failed: "Inspect the error and retry, or complete the step manually.",
  retrying: "Failed once and is being retried automatically.",
  cancelled: "Stopped on request; re-run if still needed.",
};

// ---------------------------------------------------------------------------
// Providers / integrations
// ---------------------------------------------------------------------------

export const providerStatuses = [
  "disconnected",
  "connecting",
  "connected",
  "degraded",
  "error",
  "reauth_required",
] as const;
export type ProviderStatus = (typeof providerStatuses)[number];
export const ProviderStatusSchema = z.enum(providerStatuses);
export const providerStatusLabel: Record<ProviderStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "Connected",
  degraded: "Degraded",
  error: "Error",
  reauth_required: "Re-authorization required",
};
export const providerStatusHint: Record<ProviderStatus, string> = {
  disconnected: "Connect this provider to unlock the capability.",
  connecting: "Finish the connection flow in the provider's window.",
  connected: "Working normally.",
  degraded: "Some calls are failing; features may fall back to manual mode.",
  error: "The last call failed. Check credentials and retry.",
  reauth_required: "Reconnect the provider to refresh its authorization.",
};

export const providerCapabilities = [
  "ai",
  "crm",
  "recording",
  "hosting",
  "research",
  "enrichment",
  "email",
  "calendar",
  "social_publishing",
  "analytics",
  "transcription",
] as const;
export type ProviderCapability = (typeof providerCapabilities)[number];
export const ProviderCapabilitySchema = z.enum(providerCapabilities);
export const providerCapabilityLabel: Record<ProviderCapability, string> = {
  ai: "AI",
  crm: "CRM",
  recording: "Recording",
  hosting: "Hosting",
  research: "Research",
  enrichment: "Enrichment",
  email: "Email",
  calendar: "Calendar",
  social_publishing: "Social publishing",
  analytics: "Analytics",
  transcription: "Transcription",
};

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export const relationshipCategories = [
  "guest",
  "host",
  "partner",
  "sponsor",
  "investor",
  "client",
  "prospect",
  "referral_source",
  "mentor",
  "friend",
  "event_organizer",
  "recruit",
  "introducer",
] as const;
export type RelationshipCategory = (typeof relationshipCategories)[number];
export const RelationshipCategorySchema = z.enum(relationshipCategories);
export const relationshipCategoryLabel: Record<RelationshipCategory, string> = {
  guest: "Guest",
  host: "Host",
  partner: "Partner",
  sponsor: "Sponsor",
  investor: "Investor",
  client: "Client",
  prospect: "Prospect",
  referral_source: "Referral source",
  mentor: "Mentor",
  friend: "Friend",
  event_organizer: "Event organizer",
  recruit: "Recruit",
  introducer: "Introducer",
};

// ---------------------------------------------------------------------------
// Content assets
// ---------------------------------------------------------------------------

export const contentAssetTypes = [
  "episode",
  "transcript",
  "clip",
  "short",
  "quote",
  "framework",
  "story",
  "thumbnail",
  "social_post",
  "show_notes",
  "email",
  "hook",
  "title",
  "description",
  "cta",
  "document",
  "generated",
] as const;
export type ContentAssetType = (typeof contentAssetTypes)[number];
export const ContentAssetTypeSchema = z.enum(contentAssetTypes);
export const contentAssetTypeLabel: Record<ContentAssetType, string> = {
  episode: "Episode",
  transcript: "Transcript",
  clip: "Clip",
  short: "Short",
  quote: "Quote",
  framework: "Framework",
  story: "Story",
  thumbnail: "Thumbnail",
  social_post: "Social post",
  show_notes: "Show notes",
  email: "Email",
  hook: "Hook",
  title: "Title",
  description: "Description",
  cta: "CTA",
  document: "Document",
  generated: "Generated",
};

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export const publishingStatuses = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "manual",
] as const;
export type PublishingStatus = (typeof publishingStatuses)[number];
export const PublishingStatusSchema = z.enum(publishingStatuses);
export const publishingStatusLabel: Record<PublishingStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  manual: "Manual",
};
export const publishingStatusHint: Record<PublishingStatus, string> = {
  draft: "Finish the metadata and schedule or publish.",
  scheduled: "Will publish automatically at the scheduled time.",
  publishing: "Upload in progress with the destination provider.",
  published: "Live. Verify the public link and move on to distribution.",
  failed: "Check the provider error and retry, or publish manually.",
  manual: "Publish on the destination yourself and paste the public URL.",
};

// ---------------------------------------------------------------------------
// Transcripts
// ---------------------------------------------------------------------------

export const transcriptStatuses = ["pending", "processing", "ready", "failed"] as const;
export type TranscriptStatus = (typeof transcriptStatuses)[number];
export const TranscriptStatusSchema = z.enum(transcriptStatuses);
export const transcriptStatusLabel: Record<TranscriptStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};
export const transcriptStatusHint: Record<TranscriptStatus, string> = {
  pending: "Upload a recording or paste a transcript to get started.",
  processing: "Transcription is running; this usually takes a few minutes.",
  ready: "Transcript is ready. Run opportunity extraction and repurposing.",
  failed: "Transcription failed. Retry or paste a transcript manually.",
};
