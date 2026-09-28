import { describe, expect, it } from "vitest";
import {
  canTransitionGuest,
  computeFitScore,
  fitBand,
  fitScoreInputs,
  fitScoreKeys,
  guestStageProgressPercent,
  guestStageTransitions,
  transitionGuest,
} from "./guests";
import { guestStages } from "./vocab";

describe("guest stage transitions", () => {
  it("has an entry for every stage", () => {
    for (const s of guestStages) expect(guestStageTransitions[s]).toBeDefined();
  });

  it("allows one step forward and one step back", () => {
    expect(canTransitionGuest("prospect", "researched")).toBe(true);
    expect(canTransitionGuest("researched", "prospect")).toBe(true);
    expect(canTransitionGuest("booked", "preparation")).toBe(true);
    expect(canTransitionGuest("preparation", "booked")).toBe(true);
  });

  it("does not allow skipping research", () => {
    expect(canTransitionGuest("prospect", "approved")).toBe(false);
  });

  it("allows the documented shortcuts", () => {
    expect(canTransitionGuest("approved", "ready_to_contact")).toBe(true);
    expect(canTransitionGuest("interested", "booked")).toBe(true);
  });

  it("only allows follow_up from published, then relationship", () => {
    for (const s of guestStages) {
      const expected = s === "published" || s === "relationship";
      expect(canTransitionGuest(s, "follow_up"), `${s} -> follow_up`).toBe(expected);
    }
    expect(canTransitionGuest("follow_up", "relationship")).toBe(true);
    expect(canTransitionGuest("follow_up", "published")).toBe(true);
  });

  it("transitionGuest explains failures", () => {
    expect(transitionGuest("contacted", "replied")).toEqual({ ok: true, status: "replied" });
    const bad = transitionGuest("contacted", "recorded");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toContain("Cannot move from Contacted to Recorded");
    expect(transitionGuest("contacted", "contacted").ok).toBe(false);
  });

  it("progress percent spans 0..100", () => {
    expect(guestStageProgressPercent("prospect")).toBe(0);
    expect(guestStageProgressPercent("relationship")).toBe(100);
  });
});

describe("computeFitScore", () => {
  it("covers all nine documented inputs", () => {
    expect(fitScoreInputs.map((i) => i.key)).toEqual(fitScoreKeys);
    expect(fitScoreInputs.reduce((s, i) => s + i.weight, 0)).toBe(100);
  });

  it("returns 0 with full missing list when nothing provided", () => {
    const r = computeFitScore({});
    expect(r.score).toBe(0);
    expect(r.coverage).toBe(0);
    expect(r.missing).toEqual(fitScoreKeys);
    expect(r.breakdown).toEqual([]);
  });

  it("scores 100 when everything is 5 and 0 when everything is 0", () => {
    const all5 = Object.fromEntries(fitScoreKeys.map((k) => [k, 5]));
    const all0 = Object.fromEntries(fitScoreKeys.map((k) => [k, 0]));
    const r5 = computeFitScore(all5);
    expect(r5.score).toBe(100);
    expect(r5.coverage).toBe(1);
    expect(r5.missing).toEqual([]);
    expect(r5.breakdown.reduce((s, b) => s + b.contribution, 0)).toBeCloseTo(100, 0);
    expect(computeFitScore(all0).score).toBe(0);
  });

  it("normalizes over provided weight only", () => {
    // expertise_fit weight 15 at 5/5, audience_overlap weight 10 at 0/5 → 15/25 = 60
    const r = computeFitScore({ expertise_fit: 5, audience_overlap: 0 });
    expect(r.score).toBe(60);
    expect(r.coverage).toBeCloseTo(0.25);
    expect(r.missing).toHaveLength(7);
    expect(r.breakdown).toEqual([
      { key: "expertise_fit", label: "Expertise fit", value: 5, weight: 15, contribution: 60 },
      { key: "audience_overlap", label: "Audience overlap", value: 0, weight: 10, contribution: 0 },
    ]);
  });

  it("clamps out-of-range values and ignores null", () => {
    const r = computeFitScore({
      credibility: 9,
      response_probability: -2,
      unique_perspective: null,
    });
    expect(r.breakdown.map((b) => b.value)).toEqual([5, 0]);
    expect(r.missing).toContain("unique_perspective");
    // 10*1 + 5*0 over 15 → 66.7 → 67
    expect(r.score).toBe(67);
  });

  it("bands scores", () => {
    expect(fitBand(85)).toBe("strong");
    expect(fitBand(60)).toBe("good");
    expect(fitBand(45)).toBe("fair");
    expect(fitBand(10)).toBe("weak");
  });
});
