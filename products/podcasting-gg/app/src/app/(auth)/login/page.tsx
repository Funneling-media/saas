import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/app/auth-form";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your workspace.</p>
      </div>
      <AuthForm mode="signin" action={signIn} next={next} />
      <p className="text-muted-foreground text-sm">
        New here?{" "}
        <Link href="/signup" className="text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
