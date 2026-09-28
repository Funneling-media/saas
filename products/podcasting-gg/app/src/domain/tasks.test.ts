import { describe, expect, it } from "vitest";
import {
  TaskInputSchema,
  dueBucket,
  missionForToday,
  prioritizeTasks,
  taskFromOpportunity,
  type TaskLike,
} from "./tasks";

const now = new Date("2026-09-28T10:00:00");
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);
const uuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("TaskInputSchema", () => {
  it("applies defaults", () => {
    const parsed = TaskInputSchema.parse({ title: "Ping Sarah" });
    expect(parsed).toMatchObject({
      title: "Ping Sarah",
      status: "todo",
      priority: "medium",
      source: "user",
    });
  });

  it("rejects empty title, bad enum and bad uuid", () => {
    expect(TaskInputSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(TaskInputSchema.safeParse({ title: "x", priority: "asap" }).success).toBe(false);
    expect(TaskInputSchema.safeParse({ title: "x", guestId: "nope" }).success).toBe(false);
  });

  it("accepts ISO strings or Date for dueAt", () => {
    expect(TaskInputSchema.safeParse({ title: "x", dueAt: "2026-10-01T09:00:00Z" }).success).toBe(
      true,
    );
    expect(TaskInputSchema.safeParse({ title: "x", dueAt: new Date() }).success).toBe(true);
    expect(TaskInputSchema.safeParse({ title: "x", dueAt: "tomorrow" }).success).toBe(false);
  });
});

describe("taskFromOpportunity", () => {
  it("builds a task with source, links and next action", () => {
    const task = taskFromOpportunity({
      id: uuid,
      type: "introduction",
      title: "Intro to Dana",
      summary: "Guest offered an intro to Dana.",
      suggested_next_action: "Reply and ask for the intro.",
      confidence: 0.9,
      guestId: uuid,
    });
    expect(task.title).toBe("Introduction: Intro to Dana");
    expect(task.source).toBe("opportunity");
    expect(task.priority).toBe("high");
    expect(task.opportunityId).toBe(uuid);
    expect(task.guestId).toBe(uuid);
    expect(task.description).toContain("Next action: Reply and ask for the intro.");
  });

  it("falls back to a default next action and medium priority", () => {
    const task = taskFromOpportunity({
      type: "speaking",
      title: "Growth Lab conference",
      confidence: 0.4,
    });
    expect(task.priority).toBe("medium");
    expect(task.description).toMatch(/Next action: .+organizer/);
  });
});

describe("prioritizeTasks", () => {
  const tasks: TaskLike[] = [
    { id: "done", title: "Done thing", status: "done", priority: "urgent", dueAt: hours(-48) },
    {
      id: "upcoming-high",
      title: "Upcoming high",
      status: "todo",
      priority: "high",
      dueAt: hours(72),
    },
    { id: "today-low", title: "Today low", status: "todo", priority: "low", dueAt: hours(5) },
    { id: "today-high", title: "Today high", status: "todo", priority: "high", dueAt: hours(6) },
    {
      id: "overdue-medium",
      title: "Overdue medium",
      status: "in_progress",
      priority: "medium",
      dueAt: hours(-2),
    },
    {
      id: "overdue-urgent",
      title: "Overdue urgent",
      status: "todo",
      priority: "urgent",
      dueAt: hours(-1),
    },
    { id: "no-due", title: "No due date", status: "todo", priority: "urgent" },
    { id: "cancelled", title: "Cancelled", status: "cancelled", priority: "urgent" },
  ];

  it("orders overdue urgent, overdue, today by priority, upcoming, no-due, closed last", () => {
    expect(prioritizeTasks(tasks, now).map((t) => t.id)).toEqual([
      "overdue-urgent",
      "overdue-medium",
      "today-high",
      "today-low",
      "upcoming-high",
      "no-due",
      "done",
      "cancelled",
    ]);
  });

  it("does not mutate the input", () => {
    const copy = [...tasks];
    prioritizeTasks(tasks, now);
    expect(tasks).toEqual(copy);
  });

  it("dueBucket classifies relative to now", () => {
    expect(dueBucket(hours(-1), now)).toBe("overdue");
    expect(dueBucket(hours(2), now)).toBe("today");
    expect(dueBucket(hours(30), now)).toBe("upcoming");
    expect(dueBucket(null, now)).toBe("none");
    expect(dueBucket("garbage", now)).toBe("none");
  });
});

describe("missionForToday", () => {
  it("ranks opportunities, follow-ups and approvals above generic tasks", () => {
    const mission = missionForToday(
      {
        tasks: [
          { id: "t1", title: "Update bio", status: "todo", priority: "medium", dueAt: hours(48) },
          { id: "t2", title: "Send invoice", status: "todo", priority: "high" },
        ],
        approvalsPending: [{ id: "a1", title: "Episode 12 thumbnail", kind: "Thumbnail" }],
        opportunitiesDetected: [
          { id: "o1", title: "Intro to Dana", type: "introduction", confidence: 0.85 },
        ],
        followUpsDue: [{ id: "f1", personName: "Sarah", dueAt: hours(3) }],
        episodesAwaitingApproval: [{ id: "e1", title: "Ep 12", episodeNumber: 12 }],
      },
      now,
    );
    expect(mission.map((m) => m.kind)).toEqual([
      "opportunity",
      "follow_up",
      "episode",
      "approval",
      "task",
    ]);
    expect(mission[0]).toMatchObject({ id: "o1", priority: "high" });
    expect(mission[2]?.title).toBe("Approve Episode 12");
    expect(mission[4]?.id).toBe("t2");
    for (const m of mission) expect(m.why.length).toBeGreaterThan(5);
  });

  it("lets an overdue urgent task outrank an opportunity", () => {
    const mission = missionForToday(
      {
        tasks: [
          {
            id: "t1",
            title: "Send contract",
            status: "todo",
            priority: "urgent",
            dueAt: hours(-3),
          },
        ],
        approvalsPending: [],
        opportunitiesDetected: [
          { id: "o1", title: "Sponsor", type: "sponsorship", confidence: 0.95 },
        ],
        followUpsDue: [],
        episodesAwaitingApproval: [],
      },
      now,
    );
    expect(mission.map((m) => m.id)).toEqual(["t1", "o1"]);
  });

  it("boosts overdue follow-ups and marks them urgent", () => {
    const mission = missionForToday(
      {
        tasks: [],
        approvalsPending: [],
        opportunitiesDetected: [{ id: "o1", title: "Lead", type: "sales", confidence: 0.6 }],
        followUpsDue: [{ id: "f1", personName: "Mike", dueAt: hours(-30) }],
        episodesAwaitingApproval: [],
      },
      now,
    );
    expect(mission[0]).toMatchObject({ id: "f1", priority: "urgent" });
  });

  it("respects the limit and skips closed tasks", () => {
    const mission = missionForToday(
      {
        tasks: [
          { id: "d", title: "Done", status: "done", priority: "urgent" },
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `t${i}`,
            title: `Task ${i}`,
            status: "todo" as const,
            priority: "low" as const,
          })),
        ],
        approvalsPending: [],
        opportunitiesDetected: [],
        followUpsDue: [],
        episodesAwaitingApproval: [],
      },
      now,
      3,
    );
    expect(mission).toHaveLength(3);
    expect(mission.some((m) => m.id === "d")).toBe(false);
  });

  it("returns an empty mission when there is nothing to do", () => {
    expect(
      missionForToday(
        {
          tasks: [],
          approvalsPending: [],
          opportunitiesDetected: [],
          followUpsDue: [],
          episodesAwaitingApproval: [],
        },
        now,
      ),
    ).toEqual([]);
  });
});
