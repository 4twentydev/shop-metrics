"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/sign-out", { method: "POST" });
        router.push("/sign-in");
        router.refresh();
      }}
      className="rounded-full border border-line px-4 py-2 transition hover:border-white/40 hover:text-white"
    >
      Sign out
    </button>
  );
}
