import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Relationships" };

export default function Page() {
  return (
    <PlannedModule
      title="Relationships"
      description="What happened because you had this conversation."
      milestone={4}
      willDo="Relationship CRM: categories, strength, last touch, next follow-up, introductions, revenue influenced."
    />
  );
}
