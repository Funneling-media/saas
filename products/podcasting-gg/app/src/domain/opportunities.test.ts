import { describe, expect, it } from "vitest";
import {
  OpportunityExtractionSchema,
  canTransitionOpportunity,
  defaultNextAction,
  filterGroundedOpportunities,
  opportunityTypeLabel,
  transitionOpportunity,
  validateEvidence,
} from "./opportunities";
import { opportunityStatuses, opportunityTypes } from "./vocab";

const transcript = `
  HOST: So what's next for you?
  GUEST: Honestly, we're hiring two senior engineers right now — it's been hard.
  HOST: Interesting.
  GUEST: And you should meet my partner Dana, she runs the “Growth Lab” conference.
`;

const validItem = {
  type: "hiring",
  title: "Guest is hiring senior engineers",
  summary: "Guest mentioned actively hiring two senior engineers.",
  evidence_excerpt: "we're hiring two senior engineers right now",
  speaker: "GUEST",
  start_ms: 12300,
  confidence: 0.9,
  suggested_next_action: "Share a candidate.",
};

describe("OpportunityExtractionSchema", () => {
  it("parses valid output", () => {
    const parsed = OpportunityExtractionSchema.parse({ opportunities: [validItem] });
    expect(parsed.opportunities[0]?.type).toBe("hiring");
  });

  it("accepts null start_ms and omitted optionals", () => {
    const minimal = Object.fromEntries(
      Object.entries(validItem).filter(([k]) => k !== "speaker" && k !== "start_ms"),
    );
    expect(
      OpportunityExtractionSchema.safeParse({ opportunities: [{ ...minimal, start_ms: null }] })
        .success,
    ).toBe(true);
  });

  it("rejects bad confidence", () => {
    expect(
      OpportunityExtractionSchema.safeParse({ opportunities: [{ ...validItem, confidence: 1.2 }] })
        .success,
    ).toBe(false);
    expect(
      OpportunityExtractionSchema.safeParse({ opportunities: [{ ...validItem, confidence: -0.1 }] })
        .success,
    ).toBe(false);
  });

  it("rejects unknown type, long title and short evidence", () => {
    expect(
      OpportunityExtractionSchema.safeParse({ opportunities: [{ ...validItem, type: "lead" }] })
        .success,
    ).toBe(false);
    expect(
      OpportunityExtractionSchema.safeParse({
        opportunities: [{ ...validItem, title: "x".repeat(121) }],
      }).success,
    ).toBe(false);
    expect(
      OpportunityExtractionSchema.safeParse({
        opportunities: [{ ...validItem, evidence_excerpt: "hiring" }],
      }).success,
    ).toBe(false);
  });
});

describe("validateEvidence", () => {
  it("matches ignoring case and whitespace", () => {
    expect(validateEvidence("WE'RE   HIRING two senior\nengineers", transcript)).toBe(true);
  });

  it("normalizes curly quotes and dashes", () => {
    expect(validateEvidence('runs the "Growth Lab" conference', transcript)).toBe(true);
    expect(validateEvidence("right now - it's been hard", transcript)).toBe(true);
  });

  it("rejects paraphrases and empty excerpts", () => {
    expect(validateEvidence("they are recruiting engineers", transcript)).toBe(false);
    expect(validateEvidence("   ", transcript)).toBe(false);
  });
});

describe("filterGroundedOpportunities", () => {
  it("separates grounded from ungrounded items with reasons", () => {
    const ungrounded = { ...validItem, evidence_excerpt: "we plan to raise a Series B soon" };
    const result = filterGroundedOpportunities(
      { opportunities: [validItem, ungrounded] },
      transcript,
    );
    expect(result.grounded).toEqual([validItem]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reason).toMatch(/not found verbatim/);
  });

  it("optionally rejects low confidence", () => {
    const low = { ...validItem, confidence: 0.2 };
    const result = filterGroundedOpportunities({ opportunities: [low] }, transcript, {
      minConfidence: 0.5,
    });
    expect(result.grounded).toEqual([]);
    expect(result.rejected[0]?.reason).toMatch(/Confidence 0.2/);
  });
});

describe("opportunity transitions", () => {
  it("has an entry for every status", () => {
    for (const s of opportunityStatuses) expect(canTransitionOpportunity(s, s)).toBe(false);
  });

  it("follows the accept/dismiss flow", () => {
    expect(transitionOpportunity("detected", "accepted")).toEqual({ ok: true, status: "accepted" });
    expect(transitionOpportunity("detected", "dismissed").ok).toBe(true);
    expect(transitionOpportunity("detected", "won").ok).toBe(false);
    expect(transitionOpportunity("accepted", "in_progress").ok).toBe(true);
    expect(transitionOpportunity("in_progress", "won").ok).toBe(true);
    expect(transitionOpportunity("dismissed", "detected").ok).toBe(true);
  });
});

describe("labels and defaults", () => {
  it("has a label and default next action for every type", () => {
    for (const t of opportunityTypes) {
      expect(opportunityTypeLabel[t]).toBeTruthy();
      expect(defaultNextAction(t).length).toBeGreaterThan(10);
    }
  });
});
