import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg">This workspace isn’t available</h1>
      <p className="text-muted-foreground text-sm">
        Either the link is wrong or you don’t have access. Nothing was changed.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Go to my workspace</Link>
      </Button>
    </main>
  );
}
