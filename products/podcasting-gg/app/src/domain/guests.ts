import { guestStages, guestStageLabel, type GuestStage } from "./vocab";
import type { TransitionResult } from "./episodes";

// ---------------------------------------------------------------------------
// Stage transitions
// ---------------------------------------------------------------------------

function buildGuestTransitions(): Record<GuestStage, GuestStage[]> {
  const map = {} as Record<GuestStage, GuestStage[]>;
  guestStages.forEach((stage, i) => {
    const next = guestStages[i + 1];
    const prev = guestStages[i - 1];
    const targets: GuestStage[] = [];
    // follow_up is reachable only from published (and back from relationship).
    if (next && next !== "follow_up") targets.push(next);
    if (stage === "published") targets.push("follow_up");
    if (prev) targets.push(prev);
    map[stage] = targets;
  });
  // Shortcuts.
  map.approved.push("ready_to_contact"); // already forward step; kept explicit for clarity
  map.interested.push("booked");
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, Array.from(new Set(v))]),
  ) as Record<GuestStage, GuestStage[]>;
}

/**
 * Forward one step, backward one step, plus shortcuts:
 * approved→ready_to_contact, interested→booked. `follow_up` only from
 * published; follow_up→relationship.
 */
export const guestStageTransitions: Record<GuestStage, GuestStage[]> = buildGuestTransitions();

export function canTransitionGuest(from: GuestStage, to: GuestStage): boolean {
  return guestStageTransitions[from].includes(to);
}

export function transitionGuest(from: GuestStage, to: GuestStage): TransitionResult<GuestStage> {
  if (from === to) return { ok: false, reason: `Guest is already in ${guestStageLabel[to]}.` };
  if (!canTransitionGuest(from, to)) {
    const allowed = guestStageTransitions[from].map((s) => guestStageLabel[s]).join(", ");
    return {
      ok: false,
      reason: `Cannot move from ${guestStageLabel[from]} to ${guestStageLabel[to]}. Allowed: ${allowed}.`,
    };
  }
  return { ok: true, status: to };
}

export function guestStageProgressPercent(stage: GuestStage): number {
  return Math.round((guestStages.indexOf(stage) / (guestStages.length - 1)) * 100);
}

// ---------------------------------------------------------------------------
// Guest fit score (SPEC §18) — explainable, no follower-count ranking
// ---------------------------------------------------------------------------

export const fitScoreKeys = [
  "expertise_fit",
  "audience_overlap",
  "credibility",
  "relationship_value",
  "collaboration_potential",
  "business_relevance",
  "response_probability",
  "unique_perspective",
  "strategic_opportunity",
] as const;
export type FitScoreKey = (typeof fitScoreKeys)[number];

export interface FitScoreInputDefinition {
  key: FitScoreKey;
  label: string;
  description: string;
  weight: number;
}

/** Each input is rated 0–5. Weights sum to 100 for readability but need not. */
export const fitScoreInputs: readonly FitScoreInputDefinition[] = [
  {
    key: "expertise_fit",
    label: "Expertise fit",
    description: "How well their expertise matches the show's themes.",
    weight: 15,
  },
  {
    key: "audience_overlap",
    label: "Audience overlap",
    description: "How much their audience resembles your ICP.",
    weight: 10,
  },
  {
    key: "credibility",
    label: "Credibility",
    description: "Track record, proof and reputation in their field.",
    weight: 10,
  },
  {
    key: "relationship_value",
    label: "Relationship value",
    description: "Long-term value of having them in your network.",
    weight: 15,
  },
  {
    key: "collaboration_potential",
    label: "Collaboration potential",
    description: "Likelihood of joint projects beyond the episode.",
    weight: 10,
  },
  {
    key: "business_relevance",
    label: "Business relevance",
    description: "Direct relevance to your offers, clients or partners.",
    weight: 15,
  },
  {
    key: "response_probability",
    label: "Response probability",
    description: "How likely they are to reply and say yes.",
    weight: 5,
  },
  {
    key: "unique_perspective",
    label: "Unique perspective",
    description: "Fresh angle the audience has not heard before.",
    weight: 10,
  },
  {
    key: "strategic_opportunity",
    label: "Strategic opportunity",
    description: "Introductions, deals or doors they could open.",
    weight: 10,
  },
];

export const FIT_SCORE_MAX_VALUE = 5;

export interface FitScoreBreakdownItem {
  key: FitScoreKey;
  label: string;
  /** Provided value clamped to 0–5. */
  value: number;
  weight: number;
  /** Points contributed to the 0–100 score. */
  contribution: number;
}

export interface FitScoreResult {
  /** 0–100, or 0 when no inputs were provided. */
  score: number;
  breakdown: FitScoreBreakdownItem[];
  /** Keys the user has not rated yet. */
  missing: FitScoreKey[];
  /** Share of total weight covered by provided inputs, 0–1. */
  coverage: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Score is computed only over provided inputs and normalized by the weight
 * actually provided, so a half-rated guest is not penalized for blanks.
 * `coverage` tells the UI how much of the picture is filled in.
 */
export function computeFitScore(
  inputs: Partial<Record<FitScoreKey, number | null | undefined>>,
  config: readonly FitScoreInputDefinition[] = fitScoreInputs,
): FitScoreResult {
  const breakdown: FitScoreBreakdownItem[] = [];
  const missing: FitScoreKey[] = [];
  let providedWeight = 0;
  let totalWeight = 0;
  let weightedSum = 0;

  for (const def of config) {
    totalWeight += def.weight;
    const raw = inputs[def.key];
    if (raw === undefined || raw === null || Number.isNaN(raw)) {
      missing.push(def.key);
      continue;
    }
    const value = clamp(raw, 0, FIT_SCORE_MAX_VALUE);
    providedWeight += def.weight;
    weightedSum += (value / FIT_SCORE_MAX_VALUE) * def.weight;
    breakdown.push({ key: def.key, label: def.label, value, weight: def.weight, contribution: 0 });
  }

  if (providedWeight === 0) {
    return { score: 0, breakdown, missing, coverage: 0 };
  }

  for (const item of breakdown) {
    item.contribution = round1(
      ((item.value / FIT_SCORE_MAX_VALUE) * item.weight * 100) / providedWeight,
    );
  }
  const score = Math.round((weightedSum / providedWeight) * 100);
  const coverage = totalWeight === 0 ? 0 : providedWeight / totalWeight;
  return { score, breakdown, missing, coverage };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type FitBand = "strong" | "good" | "fair" | "weak";

export function fitBand(score: number): FitBand {
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "weak";
}
