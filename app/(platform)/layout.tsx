import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getSession } from "@/lib/auth/permissions";

const primaryLinks: { href: "/ops" | "/employee"; label: string }[] = [
  { href: "/ops", label: "Ops" },
  { href: "/employee", label: "Employee" },
];

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <div className="min-h-screen px-4 py-4 lg:px-6">
      <div className="panel-surface mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col rounded-[2rem]">
        <header className="flex flex-col gap-5 border-b border-line/80 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
              Elward Systems
            </p>
            <h1 className="mt-2 text-xl font-semibold">
              Panel-Centric Metrics
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-muted">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-line px-4 py-2 transition hover:border-accent hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <SignOutButton />
          </nav>
          <div className="rounded-2xl border border-line/80 bg-panel-strong px-4 py-3 text-sm">
            <p className="font-semibold">{session?.user.name ?? "Invited user"}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted">
              {session?.user.activeRole ?? "employee"}
            </p>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
