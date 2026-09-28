import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus, OpportunityType, EpisodeStatus } from "@/domain/vocab";

export type MissionTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  source: string | null;
  episode_id: string | null;
  opportunity_id: string | null;
  guest_id: string | null;
  contact_id: string | null;
};

export type MissionData = {
  tasks: MissionTask[];
  approvalsPending: { id: string; kind: string; entity_type: string; entity_id: string }[];
  opportunitiesDetected: {
    id: string;
    title: string;
    type: OpportunityType;
    confidence: number | null;
  }[];
  followUpsDue: {
    id: string;
    contact_id: string;
    next_follow_up_at: string;
    contact: { full_name: string } | null;
  }[];
  episodesAwaitingApproval: { id: string; title: string; status: EpisodeStatus }[];
  episodes: {
    id: string;
    status: EpisodeStatus;
    publish_date: string | null;
    completion: Record<string, boolean>;
  }[];
  podcast: {
    id: string;
    name: string;
    medium: "video" | "audio";
    target_episode_count: number;
  } | null;
  relationshipsActive: number;
  opportunitiesAccepted: number;
  followUpsCompleted: number;
};

/** Everything Mission Control needs, in parallel, scoped by RLS to the workspace. */
export async function loadMissionData(workspaceId: string): Promise<MissionData> {
  const supabase = await createSupabaseServerClient();
  const ws = (q: { eq: (col: string, val: string) => unknown }) =>
    q.eq("workspace_id", workspaceId);
  const today = new Date().toISOString().slice(0, 10);

  const [
    tasks,
    approvals,
    opportunities,
    followUps,
    episodes,
    podcast,
    relationships,
    accepted,
    followUpsDone,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, due_date, source, episode_id, opportunity_id, guest_id, contact_id",
      )
      .eq("workspace_id", workspaceId)
      .in("status", ["todo", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("approvals")
      .select("id, kind, entity_type, entity_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .limit(20),
    supabase
      .from("opportunities")
      .select("id, title, type, confidence")
      .eq("workspace_id", workspaceId)
      .eq("status", "detected")
      .order("confidence", { ascending: false, nullsFirst: false })
      .limit(10),
    supabase
      .from("relationships")
      .select("id, contact_id, next_follow_up_at, contact:contacts(full_name)")
      .eq("workspace_id", workspaceId)
      .lte("next_follow_up_at", `${today}T23:59:59Z`)
      .order("next_follow_up_at", { ascending: true })
      .limit(10),
    supabase
      .from("episodes")
      .select("id, title, status, publish_date, completion")
      .eq("workspace_id", workspaceId)
      .order("episode_number", { ascending: true }),
    supabase
      .from("podcasts")
      .select("id, name, medium, target_episode_count")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("relationships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("last_interaction_at", new Date(Date.now() - 90 * 86400000).toISOString()),
    supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("status", ["accepted", "in_progress", "won"]),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "done")
      .eq("source", "follow_up"),
  ]);
  void ws;

  for (const r of [tasks, approvals, opportunities, followUps, episodes, podcast]) {
    if (r.error) throw r.error;
  }

  type EpisodeRow = {
    id: string;
    title: string;
    status: EpisodeStatus;
    publish_date: string | null;
    completion: Record<string, boolean> | null;
  };
  type FollowUpRow = {
    id: string;
    contact_id: string;
    next_follow_up_at: string;
    contact: { full_name: string } | { full_name: string }[] | null;
  };

  const episodeRows = (episodes.data ?? []) as EpisodeRow[];

  return {
    tasks: (tasks.data ?? []) as MissionTask[],
    approvalsPending: approvals.data ?? [],
    opportunitiesDetected: (opportunities.data ?? []) as MissionData["opportunitiesDetected"],
    followUpsDue: ((followUps.data ?? []) as FollowUpRow[]).map((f) => ({
      ...f,
      contact: Array.isArray(f.contact) ? (f.contact[0] ?? null) : f.contact,
    })),
    episodesAwaitingApproval: episodeRows
      .filter((e) => e.status === "approval" || e.status === "review")
      .map((e) => ({ id: e.id, title: e.title, status: e.status })),
    episodes: episodeRows.map((e) => ({
      id: e.id,
      status: e.status,
      publish_date: e.publish_date,
      completion: e.completion ?? {},
    })),
    podcast: (podcast.data as MissionData["podcast"]) ?? null,
    relationshipsActive: relationships.count ?? 0,
    opportunitiesAccepted: accepted.count ?? 0,
    followUpsCompleted: followUpsDone.count ?? 0,
  };
}
