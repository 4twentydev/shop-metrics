import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInPanel } from "@/features/auth/components/sign-in-panel";
import { getSession } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage() {
  const session = await getSession();

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
            Sign in with your email and PIN.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted">
            Use your work email and the 4-digit PIN assigned by your
            administrator. Contact an admin if you don&apos;t have a PIN yet.
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
              <p className="font-semibold text-white">PIN authentication</p>
              <p className="mt-2">
                PINs are set by administrators and can be changed at any time.
              </p>
            </div>
          </div>
        </section>
        <SignInPanel />
      </div>
    </main>
  );
}
