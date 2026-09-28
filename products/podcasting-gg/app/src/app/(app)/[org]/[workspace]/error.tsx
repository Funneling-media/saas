"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg">Something went wrong loading this page</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Your data is safe; nothing was changed. Try again, and if it keeps happening check that the
        database is reachable.
      </p>
      <Button className="mt-4" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
