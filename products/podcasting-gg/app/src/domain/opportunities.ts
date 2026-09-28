import { z } from "zod";
import {
  OpportunityTypeSchema,
  opportunityStatusLabel,
  opportunityTypeLabel,
  type OpportunityStatus,
  type OpportunityType,
} from "./vocab";
import type { TransitionResult } from "./episodes";

export { opportunityTypeLabel };

// ---------------------------------------------------------------------------
// AI structured output (SPEC §31, §59)
// ---------------------------------------------------------------------------

export const OpportunityExtractionItemSchema = z.object({
  type: OpportunityTypeSchema,
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1),
  /** Verbatim quote from the transcript; validated against the source. */
  evidence_excerpt: z.string().trim().min(10),
  speaker: z.string().trim().min(1).optional(),
  start_ms: z.number().int().nonnegative().nullable().optional(),
  confidence: z.number().min(0).max(1),
  suggested_next_action: z.string().trim().min(1),
  potential_value_note: z.string().trim().optional(),
});
export type OpportunityExtractionItem = z.infer<typeof OpportunityExtractionItemSchema>;

export const OpportunityExtractionSchema = z.object({
  opportunities: z.array(OpportunityExtractionItemSchema),
});
export type OpportunityExtraction = z.infer<typeof OpportunityExtractionSchema>;

// ---------------------------------------------------------------------------
// Evidence grounding
// ---------------------------------------------------------------------------

/** Lowercase, collapse whitespace, normalize curly quotes/dashes. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the excerpt appears verbatim (modulo whitespace/case) in the transcript. */
export function validateEvidence(excerpt: string, transcriptText: string): boolean {
  const needle = normalizeForMatch(excerpt);
  if (needle.length === 0) return false;
  return normalizeForMatch(transcriptText).includes(needle);
}

export interface GroundingResult<T extends { evidence_excerpt: string }> {
  grounded: T[];
  rejected: { item: T; reason: string }[];
}

export function filterGroundedOpportunities<
  T extends { evidence_excerpt: string; confidence?: number },
>(
  parsed: { opportunities: T[] },
  transcriptText: string,
  options: { minConfidence?: number } = {},
): GroundingResult<T> {
  const minConfidence = options.minConfidence ?? 0;
  const grounded: T[] = [];
  const rejected: { item: T; reason: string }[] = [];
  for (const item of parsed.opportunities) {
    if (!validateEvidence(item.evidence_excerpt, transcriptText)) {
      rejected.push({ item, reason: "Evidence excerpt was not found verbatim in the transcript." });
      continue;
    }
    if (typeof item.confidence === "number" && item.confidence < minConfidence) {
      rejected.push({
        item,
        reason: `Confidence ${item.confidence} is below the minimum ${minConfidence}.`,
      });
      continue;
    }
    grounded.push(item);
  }
  return { grounded, rejected };
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export const opportunityTransitions: Record<OpportunityStatus, OpportunityStatus[]> = {
  detected: ["accepted", "dismissed"],
  accepted: ["in_progress", "won", "lost", "dismissed"],
  in_progress: ["won", "lost", "accepted"],
  won: ["in_progress"],
  lost: ["in_progress"],
  dismissed: ["detected", "accepted"],
};

export function canTransitionOpportunity(from: OpportunityStatus, to: OpportunityStatus): boolean {
  return opportunityTransitions[from].includes(to);
}

export function transitionOpportunity(
  from: OpportunityStatus,
  to: OpportunityStatus,
): TransitionResult<OpportunityStatus> {
  if (from === to)
    return { ok: false, reason: `Opportunity is already ${opportunityStatusLabel[to]}.` };
  if (!canTransitionOpportunity(from, to)) {
    const allowed = opportunityTransitions[from].map((s) => opportunityStatusLabel[s]).join(", ");
    return {
      ok: false,
      reason: `Cannot move from ${opportunityStatusLabel[from]} to ${opportunityStatusLabel[to]}. Allowed: ${allowed}.`,
    };
  }
  return { ok: true, status: to };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultNextActions: Record<OpportunityType, string> = {
  sales: "Send a short follow-up proposing a discovery call.",
  referral: "Ask who specifically they had in mind and request a warm intro.",
  introduction: "Reply thanking them and ask for the introduction by email.",
  partnership: "Outline a one-paragraph partnership idea and share it.",
  sponsorship: "Send your sponsorship one-pager and audience overview.",
  speaking: "Ask for the organizer's contact and submit a talk idea.",
  hiring: "Share a relevant candidate or your own availability.",
  investment: "Send a brief on the opportunity and propose a call.",
  collaboration: "Propose a concrete first collaboration with a date.",
  media: "Pitch a story angle to the outlet or journalist mentioned.",
  content: "Turn the moment into a clip or post and tag the guest.",
  other: "Decide the next step and log it as a task.",
};

export function defaultNextAction(type: OpportunityType): string {
  return defaultNextActions[type];
}
