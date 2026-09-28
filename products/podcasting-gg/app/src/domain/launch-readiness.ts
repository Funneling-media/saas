/**
 * Launch Readiness Score (SPEC §44).
 *
 * The percent is weight-based and every incomplete item is returned with a
 * hint, so the number is always explainable and actionable.
 */

export interface LaunchPodcastContext {
  name?: string | null;
  description?: string | null;
  artworkUrl?: string | null;
  cta?: string | null;
}

export interface LaunchStrategyContext {
  positioning?: string | null;
  targetAudience?: string | null;
}

export interface LaunchBrandKitContext {
  primaryColor?: string | null;
  logoUrl?: string | null;
  fontFamily?: string | null;
  voiceNotes?: string | null;
}

export interface LaunchFounderProfileContext {
  displayName?: string | null;
  bio?: string | null;
  headshotUrl?: string | null;
}

export interface LaunchReadinessContext {
  podcast: LaunchPodcastContext | null | undefined;
  strategy: LaunchStrategyContext | null | undefined;
  brandKit: LaunchBrandKitContext | null | undefined;
  founderProfile: LaunchFounderProfileContext | null | undefined;
  guestCount: number;
  episodeCount: number;
  destinationsCount: number;
}

export interface LaunchReadinessCheck {
  key: string;
  label: string;
  hint: string;
  weight: number;
  test: (ctx: LaunchReadinessContext) => boolean;
}

const filled = (value: string | null | undefined, min = 1): boolean =>
  typeof value === "string" && value.trim().length >= min;

export const launchReadinessChecks: readonly LaunchReadinessCheck[] = [
  {
    key: "positioning",
    label: "Podcast positioning",
    hint: "Write one sentence on who the show is for and why it exists.",
    weight: 15,
    test: (ctx) => filled(ctx.strategy?.positioning, 20) && filled(ctx.strategy?.targetAudience),
  },
  {
    key: "description",
    label: "Podcast description",
    hint: "Add a show description of at least 80 characters for directories.",
    weight: 10,
    test: (ctx) => filled(ctx.podcast?.name) && filled(ctx.podcast?.description, 80),
  },
  {
    key: "artwork",
    label: "Cover artwork",
    hint: "Upload square cover artwork (3000x3000 recommended).",
    weight: 10,
    test: (ctx) => filled(ctx.podcast?.artworkUrl),
  },
  {
    key: "host_profile",
    label: "Host profile",
    hint: "Complete your name, bio and headshot; guests and listeners will look you up.",
    weight: 10,
    test: (ctx) =>
      filled(ctx.founderProfile?.displayName) &&
      filled(ctx.founderProfile?.bio, 40) &&
      filled(ctx.founderProfile?.headshotUrl),
  },
  {
    key: "cta",
    label: "Call to action",
    hint: "Decide the one thing you want listeners to do after every episode.",
    weight: 10,
    test: (ctx) => filled(ctx.podcast?.cta, 5),
  },
  {
    key: "first_guests",
    label: "First 3 guests",
    hint: "Add at least three guests to the pipeline so you launch with momentum.",
    weight: 15,
    test: (ctx) => ctx.guestCount >= 3,
  },
  {
    key: "first_episode",
    label: "First episode",
    hint: "Create your first episode record and move it toward recording.",
    weight: 10,
    test: (ctx) => ctx.episodeCount >= 1,
  },
  {
    key: "distribution",
    label: "Distribution destination",
    hint: "Connect or add at least one publishing destination (host, YouTube, RSS).",
    weight: 10,
    test: (ctx) => ctx.destinationsCount >= 1,
  },
  {
    key: "brand_kit",
    label: "Brand kit basics",
    hint: "Set a primary color and logo so generated assets look like you.",
    weight: 10,
    test: (ctx) => filled(ctx.brandKit?.primaryColor) && filled(ctx.brandKit?.logoUrl),
  },
];

export interface LaunchReadinessItem {
  key: string;
  label: string;
  hint: string;
  weight: number;
}

export interface LaunchReadinessResult {
  /** Weighted percent 0–100. */
  percent: number;
  complete: LaunchReadinessItem[];
  incomplete: LaunchReadinessItem[];
  ready: boolean;
}

export function computeLaunchReadiness(
  ctx: LaunchReadinessContext,
  checks: readonly LaunchReadinessCheck[] = launchReadinessChecks,
): LaunchReadinessResult {
  const complete: LaunchReadinessItem[] = [];
  const incomplete: LaunchReadinessItem[] = [];
  let total = 0;
  let earned = 0;
  for (const check of checks) {
    total += check.weight;
    const item = { key: check.key, label: check.label, hint: check.hint, weight: check.weight };
    let passed = false;
    try {
      passed = check.test(ctx);
    } catch {
      passed = false;
    }
    if (passed) {
      earned += check.weight;
      complete.push(item);
    } else {
      incomplete.push(item);
    }
  }
  const percent = total === 0 ? 100 : Math.round((earned / total) * 100);
  return { percent, complete, incomplete, ready: incomplete.length === 0 };
}
