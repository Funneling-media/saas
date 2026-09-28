import { describe, expect, it } from "vitest";
import {
  computeLaunchReadiness,
  launchReadinessChecks,
  type LaunchReadinessContext,
} from "./launch-readiness";

const empty: LaunchReadinessContext = {
  podcast: null,
  strategy: null,
  brandKit: null,
  founderProfile: null,
  guestCount: 0,
  episodeCount: 0,
  destinationsCount: 0,
};

const full: LaunchReadinessContext = {
  podcast: {
    name: "The Growth Operator",
    description:
      "A show for B2B founders who want their podcast to generate relationships, opportunities and revenue.",
    artworkUrl: "https://cdn.example.com/art.png",
    cta: "Book a strategy call at example.com/call",
  },
  strategy: {
    positioning: "The podcast for B2B founders turning conversations into pipeline.",
    targetAudience: "B2B founders, 10-200 employees",
  },
  brandKit: { primaryColor: "#0f172a", logoUrl: "https://cdn.example.com/logo.svg" },
  founderProfile: {
    displayName: "Alex Founder",
    bio: "Alex has built and sold two agencies and now helps founders grow through podcasting.",
    headshotUrl: "https://cdn.example.com/alex.jpg",
  },
  guestCount: 3,
  episodeCount: 1,
  destinationsCount: 1,
};

describe("computeLaunchReadiness", () => {
  it("weights sum to 100 and keys are unique", () => {
    expect(launchReadinessChecks.reduce((s, c) => s + c.weight, 0)).toBe(100);
    expect(new Set(launchReadinessChecks.map((c) => c.key)).size).toBe(
      launchReadinessChecks.length,
    );
  });

  it("is 0% with every item incomplete and hinted", () => {
    const r = computeLaunchReadiness(empty);
    expect(r.percent).toBe(0);
    expect(r.ready).toBe(false);
    expect(r.complete).toEqual([]);
    expect(r.incomplete.map((i) => i.key)).toEqual(launchReadinessChecks.map((c) => c.key));
    for (const i of r.incomplete) expect(i.hint.length).toBeGreaterThan(10);
  });

  it("is 100% and ready when everything is filled", () => {
    const r = computeLaunchReadiness(full);
    expect(r.percent).toBe(100);
    expect(r.ready).toBe(true);
    expect(r.incomplete).toEqual([]);
  });

  it("explains partial readiness by weight", () => {
    const r = computeLaunchReadiness({ ...full, guestCount: 2, destinationsCount: 0 });
    expect(r.percent).toBe(75);
    expect(r.incomplete.map((i) => i.key)).toEqual(["first_guests", "distribution"]);
  });

  it("requires minimum lengths for description and positioning", () => {
    const r = computeLaunchReadiness({
      ...full,
      podcast: { ...full.podcast, description: "Too short" },
      strategy: { positioning: "Short", targetAudience: "Founders" },
    });
    expect(r.incomplete.map((i) => i.key)).toEqual(["positioning", "description"]);
  });

  it("supports a custom check list and treats throwing tests as incomplete", () => {
    const r = computeLaunchReadiness(empty, [
      { key: "a", label: "A", hint: "do a", weight: 1, test: () => true },
      {
        key: "b",
        label: "B",
        hint: "do b",
        weight: 1,
        test: () => {
          throw new Error("boom");
        },
      },
    ]);
    expect(r.percent).toBe(50);
    expect(r.incomplete[0]?.key).toBe("b");
  });
});
