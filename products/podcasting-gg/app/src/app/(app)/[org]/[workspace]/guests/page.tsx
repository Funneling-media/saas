import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Guests" };

export default function Page() {
  return (
    <PlannedModule
      title="Guests"
      description="Pipeline from prospect to relationship."
      milestone={4}
      willDo="Guest CRM with list and kanban views, explainable fit scores, research briefs and outreach drafts."
    />
  );
}
