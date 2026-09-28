import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Wordmark } from "@/components/app/wordmark";
import { CreateOrganizationForm } from "./create-organization-form";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const firstName = user.fullName?.split(" ")[0];

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 p-6">
      <Wordmark />
      <div className="space-y-1">
        <h1 className="text-xl">
          {firstName ? `Hi ${firstName}, ` : ""}let’s set up your workspace
        </h1>
        <p className="text-muted-foreground">
          A workspace holds one brand: its podcast, guests, relationships and knowledge. You can add
          more later.
        </p>
      </div>
      <CreateOrganizationForm />
    </main>
  );
}
