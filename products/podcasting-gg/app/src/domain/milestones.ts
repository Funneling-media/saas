/**
 * Top 1% / 20-episode milestone system (SPEC §15, §93).
 *
 * Every number shown to the user is a raw count with a transparent threshold.
 * There is deliberately no blended "score".
 */

export type MilestoneKey =
  "launch" | "consistent" | "authority" | "network_builder" | "top_1_percent";

export const milestoneKeys: readonly MilestoneKey[] = [
  "launch",
  "consistent",
  "authority",
  "network_builder",
  "top_1_percent",
];

export type Criterion =
  | { kind: "episodes_complete"; min: number }
  /** Episodes published in at least `min` distinct ISO weeks within the last 12. */
  | { kind: "consistency_weeks"; min: number }
  | { kind: "relationships_active"; min: number }
  | { kind: "opportunities_accepted"; min: number }
  | { kind: "follow_ups_completed"; min: number };

export type CriterionKind = Criterion["kind"];

export const criterionLabel: Record<CriterionKind, string> = {
  episodes_complete: "Strategically complete episodes",
  consistency_weeks: "Weeks with a published episode (last 12)",
  relationships_active: "Active relationships",
  opportunities_accepted: "Opportunities accepted",
  follow_ups_completed: "Guest follow-ups completed",
};

export interface MilestoneDefinition {
  key: MilestoneKey;
  label: string;
  description: string;
  criteria: Criterion[];
}

export const defaultMilestones: readonly MilestoneDefinition[] = [
  {
    key: "launch",
    label: "Launch",
    description: "Your first strategically complete episode is live.",
    criteria: [{ kind: "episodes_complete", min: 1 }],
  },
  {
    key: "consistent",
    label: "Consistent",
    description: "Four complete episodes, published across four different weeks.",
    criteria: [
      { kind: "episodes_complete", min: 4 },
      { kind: "consistency_weeks", min: 4 },
    ],
  },
  {
    key: "authority",
    label: "Authority",
    description: "Ten complete episodes, steady cadence, and real relationships forming.",
    criteria: [
      { kind: "episodes_complete", min: 10 },
      { kind: "consistency_weeks", min: 8 },
      { kind: "relationships_active", min: 5 },
    ],
  },
  {
    key: "network_builder",
    label: "Network Builder",
    description: "The podcast is generating relationships, follow-ups and opportunities.",
    criteria: [
      { kind: "episodes_complete", min: 15 },
      { kind: "relationships_active", min: 10 },
      { kind: "opportunities_accepted", min: 3 },
      { kind: "follow_ups_completed", min: 10 },
    ],
  },
  {
    key: "top_1_percent",
    label: "Top 1%",
    description: "Twenty strategically complete episodes with consistent business impact.",
    criteria: [
      { kind: "episodes_complete", min: 20 },
      { kind: "consistency_weeks", min: 12 },
      { kind: "relationships_active", min: 15 },
      { kind: "opportunities_accepted", min: 5 },
      { kind: "follow_ups_completed", min: 15 },
    ],
  },
];

export interface MilestoneInputs {
  episodesComplete: number;
  /** Distinct ISO weeks with a publish in the window; see countDistinctPublishWeeks. */
  publishWeeks: number;
  relationshipsActive: number;
  opportunitiesAccepted: number;
  followUpsCompleted: number;
  targetEpisodes: number;
}

export interface CriterionEvaluation {
  kind: CriterionKind;
  label: string;
  current: number;
  required: number;
  met: boolean;
}

export interface MilestoneEvaluation {
  key: MilestoneKey;
  label: string;
  description: string;
  achieved: boolean;
  criteria: CriterionEvaluation[];
}

export interface EpisodeProgress {
  complete: number;
  target: number;
  percent: number;
}

export interface MilestonesResult {
  milestones: MilestoneEvaluation[];
  /** Highest achieved milestone in config order, or null if none. */
  currentMilestone: MilestoneEvaluation | null;
  /** First unachieved milestone in config order, or null when all achieved. */
  nextMilestone: MilestoneEvaluation | null;
  episodeProgress: EpisodeProgress;
}

export function criterionCurrentValue(criterion: Criterion, inputs: MilestoneInputs): number {
  switch (criterion.kind) {
    case "episodes_complete":
      return inputs.episodesComplete;
    case "consistency_weeks":
      return inputs.publishWeeks;
    case "relationships_active":
      return inputs.relationshipsActive;
    case "opportunities_accepted":
      return inputs.opportunitiesAccepted;
    case "follow_ups_completed":
      return inputs.followUpsCompleted;
  }
}

export function evaluateCriterion(
  criterion: Criterion,
  inputs: MilestoneInputs,
): CriterionEvaluation {
  const current = criterionCurrentValue(criterion, inputs);
  return {
    kind: criterion.kind,
    label: criterionLabel[criterion.kind],
    current,
    required: criterion.min,
    met: current >= criterion.min,
  };
}

export function evaluateMilestones(
  inputs: MilestoneInputs,
  config: readonly MilestoneDefinition[] = defaultMilestones,
): MilestonesResult {
  const milestones: MilestoneEvaluation[] = config.map((def) => {
    const criteria = def.criteria.map((c) => evaluateCriterion(c, inputs));
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      achieved: criteria.every((c) => c.met),
      criteria,
    };
  });

  // "Current" is the last achieved milestone in order; the ladder is cumulative
  // by design, but we do not require earlier ones so custom configs stay flexible.
  let currentMilestone: MilestoneEvaluation | null = null;
  let nextMilestone: MilestoneEvaluation | null = null;
  for (const m of milestones) {
    if (m.achieved) currentMilestone = m;
    else if (!nextMilestone) nextMilestone = m;
  }

  const target = Math.max(1, Math.floor(inputs.targetEpisodes));
  const complete = Math.max(0, inputs.episodesComplete);
  const percent = Math.min(100, Math.round((complete / target) * 100));

  return {
    milestones,
    currentMilestone,
    nextMilestone,
    episodeProgress: { complete, target, percent },
  };
}

// ---------------------------------------------------------------------------
// ISO week helpers
// ---------------------------------------------------------------------------

/** Returns the ISO-8601 week key, e.g. "2026-W40", computed in UTC. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO weeks start Monday; shift so Thursday determines the week-year.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const MS_PER_WEEK = 7 * 86_400_000;

/**
 * Counts distinct ISO weeks containing at least one publish date within the
 * trailing `windowWeeks` weeks ending at `now` (inclusive of now, exclusive of
 * dates in the future and dates older than the window).
 */
export function countDistinctPublishWeeks(
  dates: readonly (Date | string)[],
  now: Date = new Date(),
  windowWeeks = 12,
): number {
  const end = now.getTime();
  const start = end - windowWeeks * MS_PER_WEEK;
  const weeks = new Set<string>();
  for (const raw of dates) {
    const d = raw instanceof Date ? raw : new Date(raw);
    const t = d.getTime();
    if (Number.isNaN(t)) continue;
    if (t > end || t <= start) continue;
    weeks.add(isoWeekKey(d));
  }
  return weeks.size;
}
