"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function SignInPanel() {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  function handlePinChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    if (value && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const pinString = pin.join("");
    if (pinString.length !== 4) {
      setError("Enter your 4-digit PIN.");
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinString }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error: string }).error
            : "Invalid PIN.",
        );
        setIsPending(false);
        return;
      }

      startTransition(() => {
        router.push("/employee");
        router.refresh();
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
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
          Enter your PIN.
        </h2>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-muted">
              4-digit PIN
            </label>
            <div className="mt-2 flex gap-3">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={(event) => handlePinChange(i, event.target.value)}
                  onKeyDown={(event) => handlePinKeyDown(i, event)}
                  className="h-14 w-14 rounded-2xl border border-line bg-white/[0.03] text-center text-xl font-semibold outline-none transition focus:border-accent"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full border border-line px-5 py-3 font-semibold transition hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 min-h-6 text-sm text-muted">
          {error ?? "Accounts are provisioned by administrators only."}
        </div>
      </div>
    </motion.section>
  );
}
