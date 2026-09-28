import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Opportunities" };

export default function Page() {
  return (
    <PlannedModule
      title="Opportunities"
      description="Business opportunities detected in your conversations, with evidence."
      milestone={8}
      willDo="The Opportunity Engine reads transcripts and proposes introductions, sales, speaking, partnership and hiring opportunities. You accept, dismiss, edit or convert to a task."
    />
  );
}
