"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  // Controlled, so a wrong password doesn't clear the email (React resets
  // uncontrolled fields after a form action).
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field mt-1"
        />
      </label>
      {state?.error && (
        <p role="alert" className="tone-pink rounded-xl px-3.5 py-2.5 text-sm">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}
