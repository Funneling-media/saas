import { describe, expect, it } from "vitest";
import {
  applicableCompletionRequirements,
  canTransitionEpisode,
  computeEpisodeCompletion,
  episodeCompletionRequirements,
  episodeProgressPercent,
  episodeTransitions,
  isStrategicallyComplete,
  transitionEpisode,
} from "./episodes";
import { episodeStatuses } from "./vocab";

const allDone = Object.fromEntries(episodeCompletionRequirements.map((r) => [r.key, true]));

describe("episode transitions", () => {
  it("covers every status", () => {
    for (const s of episodeStatuses) expect(episodeTransitions[s]).toBeDefined();
  });

  it("allows the canonical forward path", () => {
    for (let i = 0; i < episodeStatuses.length - 1; i++) {
      const from = episodeStatuses[i]!;
      const to = episodeStatuses[i + 1]!;
      expect(canTransitionEpisode(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it("allows sensible back-steps", () => {
    expect(canTransitionEpisode("review", "editing")).toBe(true);
    expect(canTransitionEpisode("approval", "review")).toBe(true);
    expect(canTransitionEpisode("distribution", "follow_up")).toBe(true);
    expect(canTransitionEpisode("follow_up", "complete")).toBe(true);
  });

  it("never allows going back to idea", () => {
    for (const s of episodeStatuses) expect(canTransitionEpisode(s, "idea")).toBe(false);
  });

  it("rejects skipping far ahead", () => {
    expect(canTransitionEpisode("idea", "publishing")).toBe(false);
    expect(canTransitionEpisode("recording", "complete")).toBe(false);
  });

  it("transitionEpisode returns explainable results", () => {
    expect(transitionEpisode("editing", "review")).toEqual({ ok: true, status: "review" });
    const bad = transitionEpisode("editing", "complete");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/Cannot move from Editing to Complete/);
    const same = transitionEpisode("editing", "editing");
    expect(same.ok).toBe(false);
  });

  it("progress percent is linear 0..100", () => {
    expect(episodeProgressPercent("idea")).toBe(0);
    expect(episodeProgressPercent("complete")).toBe(100);
    expect(episodeProgressPercent("editing")).toBe(42);
  });
});

describe("episode completion", () => {
  it("thumbnail applies to video only", () => {
    const video = applicableCompletionRequirements({ medium: "video" }).map((r) => r.key);
    const audio = applicableCompletionRequirements({ medium: "audio" }).map((r) => r.key);
    expect(video).toContain("thumbnail_completed");
    expect(audio).not.toContain("thumbnail_completed");
    expect(audio).toContain("audio_published");
    expect(video).toContain("audio_published");
  });

  it("is complete when all applicable items are done", () => {
    const result = computeEpisodeCompletion(allDone, { medium: "video" });
    expect(result.complete).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("audio podcasts do not need a thumbnail", () => {
    const rest = Object.fromEntries(
      Object.entries(allDone).filter(([k]) => k !== "thumbnail_completed"),
    );
    expect(computeEpisodeCompletion(rest, { medium: "audio" }).complete).toBe(true);
    const video = computeEpisodeCompletion(rest, { medium: "video" });
    expect(video.complete).toBe(false);
    expect(video.missing).toEqual(["thumbnail_completed"]);
  });

  it("reports missing items and partial percent", () => {
    const result = computeEpisodeCompletion(
      { recording_completed: true, title_completed: true },
      { medium: "audio" },
    );
    expect(result.complete).toBe(false);
    expect(result.done).toEqual(["recording_completed", "title_completed"]);
    expect(result.missing.length).toBe(6);
    expect(result.percent).toBe(25);
  });

  it("treats unknown keys and empty input safely", () => {
    const result = computeEpisodeCompletion({ bogus: true }, { medium: "audio" });
    expect(result.done).toEqual([]);
    expect(result.percent).toBe(0);
  });

  it("isStrategicallyComplete requires status complete AND checklist", () => {
    expect(
      isStrategicallyComplete({ status: "complete", completion: allDone }, { medium: "video" }),
    ).toBe(true);
    expect(
      isStrategicallyComplete({ status: "follow_up", completion: allDone }, { medium: "video" }),
    ).toBe(false);
    expect(
      isStrategicallyComplete({ status: "complete", completion: {} }, { medium: "video" }),
    ).toBe(false);
  });
});
