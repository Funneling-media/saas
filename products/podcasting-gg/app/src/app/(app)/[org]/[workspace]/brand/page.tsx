import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Brand Kit" };

export default function Page() {
  return (
    <PlannedModule
      title="Brand Kit"
      description="The voice and visuals every AI draft must respect."
      milestone={9}
      willDo="Logo, colors, fonts, tone, voice guidelines and prohibited phrases."
    />
  );
}
