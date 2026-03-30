import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendMagicLinkEmail(input: {
  email: string;
  url: string;
}) {
  if (!resend) {
    if (env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required to send magic links.");
    }

    console.info(
      `[auth] Magic link for ${input.email}: ${input.url}`,
    );
    return;
  }

  await resend.emails.send({
    from: env.AUTH_FROM_EMAIL,
    to: input.email,
    subject: "Your Elward Systems sign-in link",
    html: `
      <p>Use the secure link below to sign in to Elward Systems Metrics.</p>
      <p><a href="${input.url}">Open secure sign-in</a></p>
      <p>This link expires quickly and should not be forwarded.</p>
    `,
  });
}
