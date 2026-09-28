import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Your guest profile" };

export default function Page() {
  return (
    <PlannedModule
      title="Your guest profile"
      description="Get booked on other people's podcasts."
      milestone={10}
      willDo="Positioning, talking points, proof and a pitch kit you can send to hosts."
    />
  );
}
