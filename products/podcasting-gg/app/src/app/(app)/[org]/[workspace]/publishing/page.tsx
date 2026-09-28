import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Publishing" };

export default function Page() {
  return (
    <PlannedModule
      title="Publishing"
      description="Where each episode goes and whether it got there."
      milestone={9}
      willDo="Destinations (RSS host, YouTube, Spotify, Apple, social) with manual/mock publishing first and real adapters as you connect them."
    />
  );
}
