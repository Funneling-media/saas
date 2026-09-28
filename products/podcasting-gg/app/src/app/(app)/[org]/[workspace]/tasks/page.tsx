import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Tasks" };

export default function Page() {
  return (
    <PlannedModule
      title="Tasks"
      description="Everything you and your team need to do, ranked."
      milestone={4}
      willDo="Tasks from episodes, guests, opportunities and follow-ups, with due dates and assignees."
    />
  );
}
