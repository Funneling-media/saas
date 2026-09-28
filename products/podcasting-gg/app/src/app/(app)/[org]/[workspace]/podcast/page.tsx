import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Podcast & strategy" };

export default function Page() {
  return (
    <PlannedModule
      title="Podcast & strategy"
      description="Your show, its positioning and the 20-episode roadmap."
      milestone={3}
      willDo="Strategist-style onboarding creates your podcast and an editable growth strategy: positioning, promise, pillars, ideal guests, CTA and roadmap."
    />
  );
}
