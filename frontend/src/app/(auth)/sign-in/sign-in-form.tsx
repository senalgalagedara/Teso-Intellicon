"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { authErrorText } from "@/lib/auth/client-errors";
import { usernameToEmail } from "@/lib/auth/username";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const rawUsername = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");

    if (!rawUsername.trim()) {
      setError("කරුණාකර ඔබගේ පරිශීලක නාමය ඇතුළත් කරන්න.");
      setPending(false);
      return;
    }

    const email = usernameToEmail(rawUsername);

    let signInError: unknown = null;
    try {
      ({ error: signInError } = await authClient.signIn.email({
        email,
        password,
      }));
    } catch (e) {
      signInError = e;
    }

    if (signInError) {
      setError(authErrorText(signInError, { fallback: "වලංගු නොවන පරිශීලක නාමයක් හෝ මුරපදයකි." }));
      setPending(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next || "/");
    router.refresh();
  }

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <Link href="/" className="back-link">
          &larr; මුල් පිටුවට
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="field">
          <span>පරිශීලක නාමය</span>
          <input
            className="input"
            type="text"
            name="username"
            autoComplete="username"
            required
            placeholder="ඔබගේ පරිශීලක නාමය ඇතුළත් කරන්න"
            autoFocus
          />
        </label>

        <label className="field">
          <span>මුරපදය</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "ඇතුළු වෙමින්..." : "ඇතුළු වන්න"}
        </button>

        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <Link href="/" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
            අවලංගු කර මුල් පිටුවට
          </Link>
        </div>
      </form>
    </div>
  );
}
