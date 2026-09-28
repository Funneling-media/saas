import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Episodes" };

export default function Page() {
  return (
    <PlannedModule
      title="Episodes"
      description="Every conversation from idea to complete."
      milestone={5}
      willDo="Episode pipeline with typed statuses, interview briefs, recording links, transcript import and the completion checklist that counts toward 20."
    />
  );
}
