"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createOrganizationWithWorkspace } from "@/db/organizations";

export type CreateOrgState = { error?: string } | undefined;

const schema = z.object({
  organizationName: z.string().trim().min(2, { error: "Give your business a name." }).max(80),
});

export async function createOrganization(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const parsed = schema.safeParse({ organizationName: formData.get("organizationName") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const user = await requireUser();
  let target: { orgSlug: string; workspaceSlug: string };
  try {
    target = await createOrganizationWithWorkspace({
      organizationName: parsed.data.organizationName,
      userId: user.id,
    });
  } catch {
    return { error: "We couldn't create the workspace. Please try again." };
  }
  redirect(`/${target.orgSlug}/${target.workspaceSlug}`);
}
