import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInPanel } from "@/features/auth/components/sign-in-panel";
import { getSession } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, { error }] = await Promise.all([getSession(), searchParams]);

  if (session) {
    redirect("/employee");
  }

  return (
    <main className="grid-overlay flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel-surface rounded-[2rem] p-8 lg:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            Secure access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Passkeys first, magic links when needed.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted">
            Elward Systems Metrics avoids password accounts entirely. Users are
            invited by an administrator, authenticate with a registered
            passkey when available, and fall back to time-limited magic links.
          </p>
          <div className="mt-8 grid gap-4 text-sm text-muted sm:grid-cols-2">
            <div className="rounded-2xl border border-line/80 bg-panel-strong p-4">
              <p className="font-semibold text-white">Admin-controlled roles</p>
              <p className="mt-2">
                Access is assigned centrally and scoped for platform, ops, and
                employee surfaces.
              </p>
            </div>
            <div className="rounded-2xl border border-line/80 bg-panel-strong p-4">
              <p className="font-semibold text-white">Short-lived links</p>
              <p className="mt-2">
                Fallback magic links expire quickly and can be fully audited.
              </p>
            </div>
          </div>
        </section>
        <SignInPanel initialError={error} />
      </div>
    </main>
  );
}
