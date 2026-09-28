"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createOrganization } from "./actions";

export function CreateOrganizationForm() {
  const [state, action, pending] = useActionState(createOrganization, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="organizationName">Business or brand name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          placeholder="Acme Advisory"
          autoFocus
          required
        />
        <p className="text-muted-foreground text-xs">
          This becomes your organization and first workspace. You can rename both later.
        </p>
      </div>
      {state?.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
