import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Target podcasts" };

export default function Page() {
  return (
    <PlannedModule
      title="Target podcasts"
      description="Shows worth pitching, tracked from identified to published."
      milestone={10}
      willDo="Research shows and hosts, score fit, draft pitches and track bookings and appearances."
    />
  );
}
