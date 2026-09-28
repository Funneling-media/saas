import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";

/**
 * Honest placeholder for a module that is planned but not built yet.
 * Never pretend a feature exists: say which milestone brings it.
 */
export function PlannedModule({
  title,
  description,
  milestone,
  willDo,
}: {
  title: string;
  description: string;
  milestone: number;
  willDo: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="outline">Planned · Milestone {milestone}</Badge>}
      />
      <EmptyState title="Not built yet" body={willDo} />
    </>
  );
}
