"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile, saveWorkspaceName, type SettingsState } from "./actions";

function Feedback({ state }: { state: SettingsState }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p role="status" className="text-success text-sm">
        Saved.
      </p>
    );
  }
  return null;
}

export function WorkspaceNameForm({
  org,
  workspace,
  name,
  canEdit,
}: {
  org: string;
  workspace: string;
  name: string;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(saveWorkspaceName, undefined);
  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="workspace" value={workspace} />
      <div className="space-y-1.5">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input id="ws-name" name="name" defaultValue={name} disabled={!canEdit} required />
        {!canEdit && (
          <p className="text-muted-foreground text-xs">Only owners and admins can rename it.</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!canEdit || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="full-name">Your name</Label>
        <Input id="full-name" name="fullName" defaultValue={fullName} required />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
