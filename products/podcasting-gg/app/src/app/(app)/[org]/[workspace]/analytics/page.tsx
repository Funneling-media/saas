import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Analytics" };

export default function Page() {
  return (
    <PlannedModule
      title="Analytics"
      description="Media metrics and business impact, side by side."
      milestone={11}
      willDo="Episodes, consistency, relationships, opportunities, clients and revenue influenced. Unconnected sources are shown as unavailable, never faked."
    />
  );
}
