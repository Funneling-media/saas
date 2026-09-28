import { PlannedModule } from "@/components/app/planned";

export const metadata = { title: "Podcast Brain" };

export default function Page() {
  return (
    <PlannedModule
      title="Podcast Brain"
      description="Ask anything across everything you've recorded."
      milestone={7}
      willDo="Search transcripts, quotes, frameworks and stories with source citations; semantic search once embeddings are connected."
    />
  );
}
