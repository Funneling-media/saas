import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Integrations" };

export default function Page() {
  return (
    <PlannedModule
      title="Integrations"
      description="Connect your own providers. Mock or manual until you do."
      milestone={6}
      willDo="AI (bring your own key), GoHighLevel, Riverside, hosting, YouTube and more, each with a clear connected/disconnected state and what it unlocks."
    />
  );
}
