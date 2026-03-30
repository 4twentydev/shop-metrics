"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Fingerprint, Mail } from "lucide-react";
import { motion } from "motion/react";

import { authClient } from "@/lib/auth/client";
import { magicLinkSchema } from "@/lib/auth/schemas";

export function SignInPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePasskeySignIn() {
    setIsPending(true);
    setMessage(null);

    const response = await authClient.signIn.passkey();

    if (response.error) {
      setMessage(typeof response.error.message === "string" ? response.error.message : "Passkey sign-in failed.");
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.push("/employee");
      router.refresh();
    });
  }

  async function handleMagicLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = magicLinkSchema.safeParse({
      email,
      callbackURL: "/employee",
    });

    if (!parsed.success) {
      setMessage("Enter a valid work email.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    const response = await authClient.signIn.magicLink(parsed.data);

    if (response.error) {
      setMessage(typeof response.error.message === "string" ? response.error.message : "Magic link sign-in failed.");
      setIsPending(false);
      return;
    }

    setMessage("Magic link sent. Check your inbox.");
    setIsPending(false);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="panel-surface rounded-[2rem] p-8 lg:p-10"
    >
      <div className="rounded-[1.5rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
          Sign in
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Choose the lowest-friction secure path.
        </h2>

        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => {
              void handlePasskeySignIn();
            }}
            disabled={isPending}
            className="flex w-full items-center justify-between rounded-2xl border border-accent/35 bg-accent-soft px-4 py-4 text-left transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="flex items-start gap-3">
              <Fingerprint className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <p className="font-semibold">Use a passkey</p>
                <p className="mt-1 text-sm text-muted">
                  Recommended for returning users with a registered device.
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-accent" />
          </button>

          <form onSubmit={(event) => void handleMagicLinkSubmit(event)}>
            <label className="block text-sm font-medium text-muted" htmlFor="email">
              Work email
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email webauthn"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@elwardsystems.com"
                  className="w-full rounded-full border border-line bg-white/[0.03] py-3 pl-11 pr-4 outline-none transition focus:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full border border-line px-5 py-3 font-semibold transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Send link
              </button>
            </div>
          </form>
        </div>

        <div className="mt-5 min-h-6 text-sm text-muted">
          {message ?? "Accounts are provisioned by administrators only."}
        </div>
      </div>
    </motion.section>
  );
}
