import { z } from "zod";
import {
  TaskPrioritySchema,
  TaskStatusSchema,
  opportunityTypeLabel,
  type OpportunityType,
  type TaskPriority,
  type TaskStatus,
} from "./vocab";
import { defaultNextAction } from "./opportunities";

// ---------------------------------------------------------------------------
// Task input schema (SPEC §32)
// ---------------------------------------------------------------------------

export const taskSources = [
  "user",
  "episode_workflow",
  "guest_workflow",
  "opportunity",
  "ai_recommendation",
  "internal_operations",
  "publishing",
  "follow_up",
] as const;
export type TaskSource = (typeof taskSources)[number];
export const TaskSourceSchema = z.enum(taskSources);

export const TaskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  status: TaskStatusSchema.default("todo"),
  priority: TaskPrioritySchema.default("medium"),
  assigneeId: z.string().uuid().nullable().optional(),
  dueAt: z
    .union([z.iso.datetime({ offset: true }), z.date()])
    .nullable()
    .optional(),
  source: TaskSourceSchema.default("user"),
  contactId: z.string().uuid().nullable().optional(),
  guestId: z.string().uuid().nullable().optional(),
  episodeId: z.string().uuid().nullable().optional(),
  opportunityId: z.string().uuid().nullable().optional(),
});
export type TaskInput = z.input<typeof TaskInputSchema>;
export type TaskInputParsed = z.output<typeof TaskInputSchema>;

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export interface OpportunityForTask {
  id?: string | null;
  type: OpportunityType;
  title: string;
  summary?: string | null;
  suggested_next_action?: string | null;
  confidence?: number | null;
  contactId?: string | null;
  guestId?: string | null;
  episodeId?: string | null;
  dueAt?: Date | string | null;
}

/** Converts an accepted opportunity into a task ("Convert to Task"). */
export function taskFromOpportunity(opp: OpportunityForTask): TaskInputParsed {
  const action = opp.suggested_next_action?.trim() || defaultNextAction(opp.type);
  const title = `${opportunityTypeLabel[opp.type]}: ${opp.title}`.slice(0, 200);
  const priority: TaskPriority =
    typeof opp.confidence === "number" && opp.confidence >= 0.8 ? "high" : "medium";
  const description = [opp.summary?.trim(), `Next action: ${action}`].filter(Boolean).join("\n\n");
  return TaskInputSchema.parse({
    title,
    description,
    priority,
    source: "opportunity",
    opportunityId: opp.id ?? undefined,
    contactId: opp.contactId ?? undefined,
    guestId: opp.guestId ?? undefined,
    episodeId: opp.episodeId ?? undefined,
    dueAt: opp.dueAt instanceof Date ? opp.dueAt : (opp.dueAt ?? undefined),
  });
}

// ---------------------------------------------------------------------------
// Prioritization
// ---------------------------------------------------------------------------

export interface TaskLike {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: Date | string | null;
  href?: string;
}

export const priorityRank: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

export type DueBucket = "overdue" | "today" | "upcoming" | "none";

function toTime(d: Date | string | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

function endOfDay(now: Date): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function dueBucket(dueAt: Date | string | null | undefined, now: Date): DueBucket {
  const t = toTime(dueAt);
  if (t === null) return "none";
  if (t < now.getTime()) return "overdue";
  if (t <= endOfDay(now)) return "today";
  return "upcoming";
}

const bucketRank: Record<DueBucket, number> = { overdue: 0, today: 1, upcoming: 2, none: 3 };

function isClosed(status: TaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

/**
 * Sort order: open tasks before closed; overdue urgent first, then by due
 * bucket (overdue, today, upcoming, none), priority desc, earliest due, title.
 */
export function prioritizeTasks<T extends TaskLike>(
  tasks: readonly T[],
  now: Date = new Date(),
): T[] {
  return [...tasks].sort((a, b) => {
    const closedDiff = Number(isClosed(a.status)) - Number(isClosed(b.status));
    if (closedDiff !== 0) return closedDiff;

    const ba = dueBucket(a.dueAt, now);
    const bb = dueBucket(b.dueAt, now);
    const aOverdueUrgent = ba === "overdue" && a.priority === "urgent";
    const bOverdueUrgent = bb === "overdue" && b.priority === "urgent";
    if (aOverdueUrgent !== bOverdueUrgent) return aOverdueUrgent ? -1 : 1;

    if (bucketRank[ba] !== bucketRank[bb]) return bucketRank[ba] - bucketRank[bb];
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[b.priority] - priorityRank[a.priority];
    }
    const ta = toTime(a.dueAt) ?? Number.POSITIVE_INFINITY;
    const tb = toTime(b.dueAt) ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.title.localeCompare(b.title);
  });
}

// ---------------------------------------------------------------------------
// Mission Control — Today's Mission (SPEC §16)
// ---------------------------------------------------------------------------

export type MissionKind = "task" | "approval" | "opportunity" | "follow_up" | "episode";

export interface MissionItem {
  kind: MissionKind;
  id: string;
  title: string;
  /** One line explaining why this matters today. */
  why: string;
  href?: string;
  priority: TaskPriority;
}

export interface PendingApproval {
  id: string;
  title: string;
  kind?: string;
  createdAt?: Date | string | null;
  href?: string;
}

export interface DetectedOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  confidence?: number | null;
  href?: string;
}

export interface FollowUpDue {
  id: string;
  personName: string;
  dueAt?: Date | string | null;
  href?: string;
}

export interface EpisodeAwaitingApproval {
  id: string;
  title: string;
  episodeNumber?: number | null;
  href?: string;
}

export interface MissionInput {
  tasks: readonly TaskLike[];
  approvalsPending: readonly PendingApproval[];
  opportunitiesDetected: readonly DetectedOpportunity[];
  followUpsDue: readonly FollowUpDue[];
  episodesAwaitingApproval: readonly EpisodeAwaitingApproval[];
}

interface RankedMission {
  item: MissionItem;
  score: number;
}

/**
 * Business-value ranking. Higher score surfaces first.
 * Base value: opportunity 80, follow-up 75, episode approval 70, approval 65,
 * generic task 40. Overdue/urgent tasks are boosted so they can outrank them.
 */
export function missionForToday(
  input: MissionInput,
  now: Date = new Date(),
  limit = 5,
): MissionItem[] {
  const ranked: RankedMission[] = [];

  for (const opp of input.opportunitiesDetected) {
    const confidence = typeof opp.confidence === "number" ? opp.confidence : 0.5;
    ranked.push({
      score: 80 + confidence * 10,
      item: {
        kind: "opportunity",
        id: opp.id,
        title: `Review ${opportunityTypeLabel[opp.type].toLowerCase()} opportunity: ${opp.title}`,
        why: `AI detected a ${opportunityTypeLabel[opp.type].toLowerCase()} opportunity (${Math.round(confidence * 100)}% confidence). Accept or dismiss it.`,
        href: opp.href,
        priority: confidence >= 0.8 ? "high" : "medium",
      },
    });
  }

  for (const fu of input.followUpsDue) {
    const bucket = dueBucket(fu.dueAt, now);
    const overdue = bucket === "overdue";
    ranked.push({
      score: 75 + (overdue ? 20 : 0),
      item: {
        kind: "follow_up",
        id: fu.id,
        title: `Follow up with ${fu.personName}`,
        why: overdue
          ? "This follow-up is overdue. Relationships cool quickly after an episode."
          : "Follow-up is due today. Keep the relationship warm while the episode is fresh.",
        href: fu.href,
        priority: overdue ? "urgent" : "high",
      },
    });
  }

  for (const ep of input.episodesAwaitingApproval) {
    const label = ep.episodeNumber ? `Episode ${ep.episodeNumber}` : ep.title;
    ranked.push({
      score: 70,
      item: {
        kind: "episode",
        id: ep.id,
        title: `Approve ${label}`,
        why: "Publishing is blocked until you approve this episode.",
        href: ep.href,
        priority: "high",
      },
    });
  }

  for (const ap of input.approvalsPending) {
    ranked.push({
      score: 65,
      item: {
        kind: "approval",
        id: ap.id,
        title: `Approve: ${ap.title}`,
        why: ap.kind
          ? `${ap.kind} is waiting for your decision before it goes out.`
          : "Waiting for your decision before it goes out.",
        href: ap.href,
        priority: "medium",
      },
    });
  }

  for (const task of prioritizeTasks(input.tasks, now)) {
    if (isClosed(task.status)) continue;
    const bucket = dueBucket(task.dueAt, now);
    let score = 40 + priorityRank[task.priority] * 5;
    if (bucket === "overdue") score += 30;
    else if (bucket === "today") score += 15;
    if (task.priority === "urgent") score += 15;
    const why =
      bucket === "overdue"
        ? "Overdue task."
        : bucket === "today"
          ? "Due today."
          : task.priority === "urgent"
            ? "Marked urgent."
            : "Highest-priority open task.";
    ranked.push({
      score,
      item: {
        kind: "task",
        id: task.id,
        title: task.title,
        why,
        href: task.href,
        priority: task.priority,
      },
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return ranked.slice(0, Math.max(0, limit)).map((r) => r.item);
}
