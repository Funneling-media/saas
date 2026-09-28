import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Content Library" };

export default function Page() {
  return (
    <PlannedModule
      title="Content Library"
      description="Every asset, traceable to its source conversation."
      milestone={9}
      willDo="Clips, quotes, posts, show notes, hooks and titles, linked back to episode and transcript."
    />
  );
}
