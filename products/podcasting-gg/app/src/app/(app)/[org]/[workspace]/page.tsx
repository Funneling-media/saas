import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { resolveWorkspace } from "@/db/organizations";
import { loadMissionData } from "@/db/mission";
import { missionForToday, type MissionItem } from "@/domain/tasks";
import { evaluateMilestones, countDistinctPublishWeeks } from "@/domain/milestones";
import { isStrategicallyComplete } from "@/domain/episodes";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mission Control" };

export default async function MissionControlPage({ params }: PageProps<"/[org]/[workspace]">) {
  const { org, workspace } = await params;
  const ctx = await resolveWorkspace(org, workspace);
  if (!ctx) notFound();
  const base = `/${org}/${workspace}`;

  const data = await loadMissionData(ctx.workspace.id);
  const now = new Date();

  const mission = missionForToday(
    {
      tasks: data.tasks.map((t) => ({ ...t, dueAt: t.due_date, href: "/tasks" })),
      approvalsPending: data.approvalsPending.map((a) => ({
        id: a.id,
        title: `Approve ${a.kind.replace(/_/g, " ")}`,
        kind: a.kind,
        href: "/approvals",
      })),
      opportunitiesDetected: data.opportunitiesDetected.map((o) => ({
        ...o,
        href: `/opportunities?focus=${o.id}`,
      })),
      followUpsDue: data.followUpsDue.map((f) => ({
        id: f.id,
        personName: f.contact?.full_name ?? "a contact",
        dueAt: f.next_follow_up_at,
        href: `/relationships?focus=${f.contact_id}`,
      })),
      episodesAwaitingApproval: data.episodesAwaitingApproval.map((e) => ({
        ...e,
        href: `/episodes/${e.id}`,
      })),
    },
    now,
    5,
  );

  const medium = data.podcast?.medium ?? "video";
  const episodesComplete = data.episodes.filter((e) =>
    isStrategicallyComplete(e, { medium }),
  ).length;
  const publishWeeks = countDistinctPublishWeeks(
    data.episodes.flatMap((e) => (e.publish_date ? [new Date(e.publish_date)] : [])),
    now,
  );
  const progress = evaluateMilestones({
    episodesComplete,
    publishWeeks,
    relationshipsActive: data.relationshipsActive,
    opportunitiesAccepted: data.opportunitiesAccepted,
    followUpsCompleted: data.followUpsCompleted,
    targetEpisodes: data.podcast?.target_episode_count ?? 20,
  });

  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`${greeting}. Here’s what moves the business today.`}
        description={
          data.podcast
            ? `${data.podcast.name} · ${progress.episodeProgress.complete} of ${progress.episodeProgress.target} strategic episodes complete`
            : "No podcast yet. Set up your show to unlock the full plan."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="mission-heading" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="mission-heading" className="text-sm font-medium">
              Today’s mission
            </h2>
            <Link
              href={`${base}/tasks`}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              All tasks
            </Link>
          </div>

          {!data.podcast ? (
            <EmptyState
              title="Start with your podcast"
              body="Ten minutes with the strategist-style setup gives you a positioning, a 20-episode roadmap and your first guest list."
              action={
                <Button asChild>
                  <Link href={`${base}/podcast`}>Set up my podcast</Link>
                </Button>
              }
            />
          ) : mission.length === 0 ? (
            <EmptyState
              title="Nothing due. Make progress anyway."
              body="Invite a high-value guest, import your latest transcript, or pitch yourself to one relevant show."
              action={
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${base}/guests`}>Find a guest</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${base}/episodes`}>Import a transcript</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <ol className="divide-y rounded-lg border">
              {mission.map((item, i) => (
                <MissionRow key={`${item.kind}-${item.id}`} item={item} index={i + 1} base={base} />
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="progress-heading" className="rounded-lg border p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="progress-heading" className="text-sm font-medium">
                Road to Top 1%
              </h2>
              <span className="tnum text-muted-foreground text-xs">
                {progress.episodeProgress.complete}/{progress.episodeProgress.target}
              </span>
            </div>
            <Progress value={progress.episodeProgress.percent} aria-label="Episode progress" />
            <ol className="mt-4 space-y-2">
              {progress.milestones.map((m) => (
                <li key={m.key} className="flex items-start gap-2 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                      m.achieved && "border-success bg-success text-background",
                    )}
                    aria-hidden
                  >
                    {m.achieved && <Check className="size-3" />}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("leading-tight", !m.achieved && "text-muted-foreground")}>
                      {m.label}
                    </p>
                    {progress.nextMilestone?.key === m.key && (
                      <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                        {m.criteria
                          .filter((c) => !c.met)
                          .map((c) => (
                            <li key={c.kind} className="tnum">
                              {c.label}: {c.current}/{c.required}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="counts-heading" className="rounded-lg border">
            <h2 id="counts-heading" className="sr-only">
              Business signals
            </h2>
            <dl className="divide-y text-sm">
              <Stat
                label="Opportunities to review"
                value={data.opportunitiesDetected.length}
                href={`${base}/opportunities`}
              />
              <Stat
                label="Follow-ups due"
                value={data.followUpsDue.length}
                href={`${base}/relationships`}
              />
              <Stat
                label="Awaiting your approval"
                value={data.approvalsPending.length}
                href={`${base}/approvals`}
              />
              <Stat
                label="Active relationships (90d)"
                value={data.relationshipsActive}
                href={`${base}/relationships`}
              />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MissionRow({ item, index, base }: { item: MissionItem; index: number; base: string }) {
  const href = item.href ? `${base}${item.href}` : undefined;
  const inner = (
    <>
      <span className="tnum text-muted-foreground w-5 shrink-0 text-xs">{index}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        <span className="text-muted-foreground block truncate text-xs">{item.why}</span>
      </span>
      <Badge variant="outline" className="hidden capitalize sm:inline-flex">
        {item.kind.replace("_", " ")}
      </Badge>
      {href && <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
      )}
    </li>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-muted-foreground">
        <Link href={href} className="hover:text-foreground">
          {label}
        </Link>
      </dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}
