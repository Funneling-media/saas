import { describe, expect, it } from "vitest";
import {
  countDistinctPublishWeeks,
  defaultMilestones,
  evaluateMilestones,
  isoWeekKey,
  milestoneKeys,
  type MilestoneInputs,
} from "./milestones";

const zero: MilestoneInputs = {
  episodesComplete: 0,
  publishWeeks: 0,
  relationshipsActive: 0,
  opportunitiesAccepted: 0,
  followUpsCompleted: 0,
  targetEpisodes: 20,
};

describe("evaluateMilestones", () => {
  it("returns milestones in config order with every criterion transparent", () => {
    const result = evaluateMilestones(zero);
    expect(result.milestones.map((m) => m.key)).toEqual(milestoneKeys);
    expect(result.currentMilestone).toBeNull();
    expect(result.nextMilestone?.key).toBe("launch");
    const launch = result.milestones[0]!;
    expect(launch.criteria).toEqual([
      {
        kind: "episodes_complete",
        label: "Strategically complete episodes",
        current: 0,
        required: 1,
        met: false,
      },
    ]);
  });

  it("achieves launch at exactly 1 episode (boundary)", () => {
    const result = evaluateMilestones({ ...zero, episodesComplete: 1 });
    expect(result.currentMilestone?.key).toBe("launch");
    expect(result.nextMilestone?.key).toBe("consistent");
    expect(result.episodeProgress).toEqual({ complete: 1, target: 20, percent: 5 });
  });

  it("does not achieve consistent with 4 episodes but only 3 weeks", () => {
    const result = evaluateMilestones({ ...zero, episodesComplete: 4, publishWeeks: 3 });
    expect(result.currentMilestone?.key).toBe("launch");
    const consistent = result.milestones.find((m) => m.key === "consistent")!;
    expect(consistent.achieved).toBe(false);
    expect(consistent.criteria.find((c) => c.kind === "consistency_weeks")).toMatchObject({
      current: 3,
      required: 4,
      met: false,
    });
  });

  it("achieves top 1% at exact thresholds", () => {
    const result = evaluateMilestones({
      episodesComplete: 20,
      publishWeeks: 12,
      relationshipsActive: 15,
      opportunitiesAccepted: 5,
      followUpsCompleted: 15,
      targetEpisodes: 20,
    });
    expect(result.milestones.every((m) => m.achieved)).toBe(true);
    expect(result.currentMilestone?.key).toBe("top_1_percent");
    expect(result.nextMilestone).toBeNull();
    expect(result.episodeProgress.percent).toBe(100);
  });

  it("caps episode progress at 100 and guards a zero target", () => {
    expect(evaluateMilestones({ ...zero, episodesComplete: 25 }).episodeProgress.percent).toBe(100);
    expect(
      evaluateMilestones({ ...zero, episodesComplete: 3, targetEpisodes: 0 }).episodeProgress,
    ).toEqual({
      complete: 3,
      target: 1,
      percent: 100,
    });
  });

  it("accepts a custom config", () => {
    const result = evaluateMilestones(zero, [
      {
        key: "launch",
        label: "Go",
        description: "",
        criteria: [{ kind: "relationships_active", min: 0 }],
      },
    ]);
    expect(result.milestones).toHaveLength(1);
    expect(result.currentMilestone?.key).toBe("launch");
  });

  it("default config matches the documented thresholds", () => {
    const top = defaultMilestones.find((m) => m.key === "top_1_percent")!;
    expect(top.criteria).toEqual([
      { kind: "episodes_complete", min: 20 },
      { kind: "consistency_weeks", min: 12 },
      { kind: "relationships_active", min: 15 },
      { kind: "opportunities_accepted", min: 5 },
      { kind: "follow_ups_completed", min: 15 },
    ]);
  });
});

describe("isoWeekKey", () => {
  it("handles year boundaries per ISO-8601", () => {
    expect(isoWeekKey(new Date("2021-01-01T00:00:00Z"))).toBe("2020-W53");
    expect(isoWeekKey(new Date("2021-01-04T00:00:00Z"))).toBe("2021-W01");
    expect(isoWeekKey(new Date("2024-12-30T00:00:00Z"))).toBe("2025-W01");
    expect(isoWeekKey(new Date("2026-09-28T12:00:00Z"))).toBe("2026-W40");
  });

  it("puts Sunday in the same week as the preceding Monday", () => {
    expect(isoWeekKey(new Date("2026-09-21T00:00:00Z"))).toBe("2026-W39");
    expect(isoWeekKey(new Date("2026-09-27T23:59:59Z"))).toBe("2026-W39");
  });
});

describe("countDistinctPublishWeeks", () => {
  const now = new Date("2026-09-28T12:00:00Z");

  it("counts distinct weeks only", () => {
    const dates = ["2026-09-22", "2026-09-24", "2026-09-15", "2026-09-08"];
    expect(countDistinctPublishWeeks(dates, now)).toBe(3);
  });

  it("ignores future dates and dates outside the window", () => {
    const dates = ["2026-10-05", "2026-06-01", "2026-09-28T11:00:00Z"];
    expect(countDistinctPublishWeeks(dates, now)).toBe(1);
  });

  it("window boundary: exactly 12 weeks ago is excluded, one ms later is included", () => {
    const edge = new Date(now.getTime() - 12 * 7 * 86_400_000);
    expect(countDistinctPublishWeeks([edge], now)).toBe(0);
    expect(countDistinctPublishWeeks([new Date(edge.getTime() + 1)], now)).toBe(1);
  });

  it("skips invalid dates and accepts a custom window", () => {
    expect(countDistinctPublishWeeks(["not a date", "2026-09-27"], now, 1)).toBe(1);
    expect(countDistinctPublishWeeks(["2026-09-10"], now, 1)).toBe(0);
  });
});
