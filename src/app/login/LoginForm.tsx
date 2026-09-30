"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, verifyEmailCode, type LoginState } from "./actions";

const IDLE: LoginState = { status: "idle" };

export function LoginForm({ next }: { next: string }) {
  const [sent, sendAction, sending] = useActionState(sendMagicLink, IDLE);
  const [verified, verifyAction, verifying] = useActionState(verifyEmailCode, IDLE);
  const [editing, setEditing] = useState(false);

  if (sent.status === "sent" && !editing) {
    return (
      <div className="mt-6" aria-live="polite">
        <div className="rounded-xl bg-leaf-soft px-4 py-3 text-leaf-deep">
          <p className="font-semibold">Check your inbox</p>
          <p className="text-sm">
            We sent a sign-in link to <strong>{sent.email}</strong>. Tap it on this device to continue.
          </p>
        </div>

        <form action={verifyAction} className="mt-5">
          <input type="hidden" name="email" value={sent.email} />
          <input type="hidden" name="next" value={next} />
          <label htmlFor="code" className="text-sm font-semibold">
            Opened the email somewhere else? Enter the code from it:
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={12}
              placeholder="123456"
              className="field min-w-0 flex-1 text-center text-lg tracking-[0.3em]"
            />
            <button type="submit" className="btn btn-primary" disabled={verifying}>
              {verifying ? "…" : "Sign in"}
            </button>
          </div>
          {verified.message ? (
            <p role="alert" className="mt-2 text-sm text-maroon">
              {verified.message}
            </p>
          ) : null}
        </form>

        <button type="button" onClick={() => setEditing(true)} className="mt-5 text-sm font-semibold text-vermilion underline underline-offset-4">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form action={(formData) => { setEditing(false); sendAction(formData); }} className="mt-6">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="text-sm font-semibold">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        defaultValue={sent.email}
        className="field mt-2"
      />
      {sent.status === "error" ? (
        <p role="alert" className="mt-2 text-sm text-maroon">
          {sent.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary mt-4 w-full" disabled={sending}>
        {sending ? "Sending…" : "Email me a magic link"}
      </button>
    </form>
  );
}
