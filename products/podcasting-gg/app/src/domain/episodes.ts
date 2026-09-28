import { episodeStatuses, episodeStatusLabel, type EpisodeStatus } from "./vocab";

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/**
 * Allowed transitions per status: the forward path plus sensible back-steps.
 * Nothing may go back to `idea`; `complete` is terminal except reopening follow-up.
 */
export const episodeTransitions: Record<EpisodeStatus, EpisodeStatus[]> = {
  idea: ["research", "booked"],
  research: ["booked", "preparation"],
  booked: ["preparation", "research"],
  preparation: ["recording", "booked"],
  recording: ["editing", "preparation"],
  editing: ["review", "recording"],
  review: ["approval", "editing"],
  approval: ["publishing", "review", "editing"],
  publishing: ["repurposing", "distribution", "approval"],
  repurposing: ["distribution", "publishing"],
  distribution: ["follow_up", "repurposing"],
  follow_up: ["complete", "distribution"],
  complete: ["follow_up"],
};

export function canTransitionEpisode(from: EpisodeStatus, to: EpisodeStatus): boolean {
  return episodeTransitions[from].includes(to);
}

export type TransitionResult<S extends string> =
  { ok: true; status: S } | { ok: false; reason: string };

export function transitionEpisode(
  from: EpisodeStatus,
  to: EpisodeStatus,
): TransitionResult<EpisodeStatus> {
  if (from === to) return { ok: false, reason: `Episode is already ${episodeStatusLabel[to]}.` };
  if (!canTransitionEpisode(from, to)) {
    const allowed = episodeTransitions[from].map((s) => episodeStatusLabel[s]).join(", ");
    return {
      ok: false,
      reason: `Cannot move from ${episodeStatusLabel[from]} to ${episodeStatusLabel[to]}. Allowed: ${allowed}.`,
    };
  }
  return { ok: true, status: to };
}

/** 0 for idea … 100 for complete, linear across the canonical path. */
export function episodeProgressPercent(status: EpisodeStatus): number {
  const index = episodeStatuses.indexOf(status);
  return Math.round((index / (episodeStatuses.length - 1)) * 100);
}

// ---------------------------------------------------------------------------
// Strategic completion checklist (SPEC §15)
// ---------------------------------------------------------------------------

export type PodcastMedium = "video" | "audio";
export interface PodcastCompletionContext {
  medium: PodcastMedium;
}

export interface EpisodeCompletionRequirement {
  key: string;
  label: string;
  required: boolean;
  /** When omitted, the requirement applies to every podcast. */
  appliesWhen?: (podcast: PodcastCompletionContext) => boolean;
}

export const episodeCompletionRequirements: readonly EpisodeCompletionRequirement[] = [
  { key: "recording_completed", label: "Recording completed", required: true },
  { key: "title_completed", label: "Title finalized", required: true },
  { key: "transcript_stored", label: "Transcript stored", required: true },
  { key: "show_notes_completed", label: "Show notes completed", required: true },
  { key: "long_form_published", label: "Long-form episode published", required: true },
  {
    key: "audio_published",
    label: "Audio published",
    required: true,
    // Every podcast publishes audio; video shows publish both.
    appliesWhen: () => true,
  },
  {
    key: "thumbnail_completed",
    label: "Thumbnail / artwork completed",
    required: true,
    appliesWhen: (podcast) => podcast.medium === "video",
  },
  { key: "distribution_updated", label: "Feed / distribution updated", required: true },
  { key: "guest_follow_up_completed", label: "Guest follow-up completed", required: true },
];

export type EpisodeCompletionKey = (typeof episodeCompletionRequirements)[number]["key"];

export interface EpisodeCompletionResult {
  complete: boolean;
  done: string[];
  missing: string[];
  /** Percent of applicable, required items done. */
  percent: number;
}

export function applicableCompletionRequirements(
  podcast: PodcastCompletionContext,
  config: readonly EpisodeCompletionRequirement[] = episodeCompletionRequirements,
): EpisodeCompletionRequirement[] {
  return config.filter((r) => (r.appliesWhen ? r.appliesWhen(podcast) : true));
}

export function computeEpisodeCompletion(
  completion: Record<string, boolean>,
  podcast: PodcastCompletionContext,
  config: readonly EpisodeCompletionRequirement[] = episodeCompletionRequirements,
): EpisodeCompletionResult {
  const applicable = applicableCompletionRequirements(podcast, config);
  const done: string[] = [];
  const missing: string[] = [];
  let requiredTotal = 0;
  let requiredDone = 0;

  for (const req of applicable) {
    const isDone = completion[req.key] === true;
    if (isDone) done.push(req.key);
    else missing.push(req.key);
    if (req.required) {
      requiredTotal += 1;
      if (isDone) requiredDone += 1;
    }
  }

  const requiredMissing = applicable.filter((r) => r.required && completion[r.key] !== true);
  const percent = requiredTotal === 0 ? 100 : Math.round((requiredDone / requiredTotal) * 100);

  return { complete: requiredMissing.length === 0, done, missing, percent };
}

export interface EpisodeLike {
  status: EpisodeStatus;
  completion: Record<string, boolean>;
}

/** An episode counts toward the 20-episode goal only when strategically complete. */
export function isStrategicallyComplete(
  episode: EpisodeLike,
  podcast: PodcastCompletionContext,
  config: readonly EpisodeCompletionRequirement[] = episodeCompletionRequirements,
): boolean {
  return (
    episode.status === "complete" &&
    computeEpisodeCompletion(episode.completion, podcast, config).complete
  );
}
