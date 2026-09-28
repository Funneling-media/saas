"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { resolveWorkspace } from "@/db/organizations";
import { renameWorkspace, updateProfileName } from "@/db/members";
import { can } from "@/domain/permissions";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

const workspaceSchema = z.object({
  org: z.string(),
  workspace: z.string(),
  name: z.string().trim().min(2, { error: "Use at least 2 characters." }).max(80),
});

export async function saveWorkspaceName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = workspaceSchema.safeParse({
    org: formData.get("org"),
    workspace: formData.get("workspace"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const ctx = await resolveWorkspace(parsed.data.org, parsed.data.workspace);
  if (!ctx) return { error: "Workspace not found." };
  if (!can(ctx.role, "workspace.manage")) {
    return { error: "Only owners and admins can rename the workspace." };
  }
  try {
    await renameWorkspace(ctx.workspace.id, parsed.data.name);
  } catch {
    return { error: "Couldn't save the name. Nothing was changed." };
  }
  revalidatePath(`/${parsed.data.org}/${parsed.data.workspace}`, "layout");
  return { ok: true };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Use at least 2 characters." }).max(80),
});

export async function saveProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const user = await requireUser();
  try {
    await updateProfileName(user.id, parsed.data.fullName);
  } catch {
    return { error: "Couldn't save your name. Nothing was changed." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
