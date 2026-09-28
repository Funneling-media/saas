import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/app/auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Takes a minute. Your strategist-style onboarding comes next.
        </p>
      </div>
      <AuthForm mode="signup" action={signUp} />
      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
