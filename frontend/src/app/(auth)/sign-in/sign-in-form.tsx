"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);

    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (signInError) {
      setError(signInError.message ?? "Could not sign in with those details.");
      setPending(false);
      return;
    }

    // replace() so the browser Back button does not return to a page that
    // expects a session. refresh() picks up the server-rendered role.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <label className="field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
