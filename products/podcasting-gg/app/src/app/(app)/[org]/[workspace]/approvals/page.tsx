import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Approvals" };

export default function Page() {
  return (
    <PlannedModule
      title="Approvals"
      description="One inbox for everything that needs your yes."
      milestone={5}
      willDo="Outreach drafts, titles, show notes, clips and publications will queue here for a one-click approve, edit or reject."
    />
  );
}
