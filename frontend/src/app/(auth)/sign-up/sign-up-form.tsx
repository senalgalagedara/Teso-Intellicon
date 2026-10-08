"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { authErrorText } from "@/lib/auth/client-errors";
import { usernameToEmail } from "@/lib/auth/username";

export function SignUpForm() {
  const router = useRouter();
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountPending, setAccountPending] = useState(false);

  async function handleAccountSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError(null);
    setAccountPending(true);

    const form = new FormData(event.currentTarget);
    const rawUsername = String(form.get("username") ?? "").trim();
    const fullName = String(form.get("name") ?? "").trim() || rawUsername;
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (!rawUsername) {
      setAccountError("Please enter a username.");
      setAccountPending(false);
      return;
    }

    if (rawUsername.length < 3) {
      setAccountError("Username must be at least 3 characters.");
      setAccountPending(false);
      return;
    }

    if (password !== confirm) {
      setAccountError("Those passwords do not match.");
      setAccountPending(false);
      return;
    }

    const email = usernameToEmail(rawUsername);

    let error: unknown = null;
    try {
      ({ error } = await authClient.signUp.email({
        name: fullName,
        email,
        password,
      }));
    } catch (e) {
      error = e;
    }

    if (error) {
      setAccountError(
        authErrorText(error, {
          duplicate: "An account with this username already exists. Try signing in instead.",
          fallback: "Could not create account with that username.",
        })
      );
      setAccountPending(false);
      return;
    }

    setAccountPending(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <Link href="/" className="back-link">
          &larr; Back to Home
        </Link>
      </div>

      <form onSubmit={handleAccountSubmit} className="auth-form">
        <label className="field">
          <span>Full name</span>
          <input
            className="input"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="e.g. Kamal Perera"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Username</span>
          <input
            className="input"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            placeholder="e.g. kamal123"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Minimum 8 characters"
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            className="input"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Re-enter your password"
          />
        </label>

        {accountError ? <p className="form-error">{accountError}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={accountPending}>
          {accountPending ? "Creating account..." : "Register Student Account"}
        </button>

        <div style={{ marginTop: "12px", textAlign: "center" }}>
          <Link href="/" className="btn btn-secondary btn-sm" style={{ width: "100%" }}>
            Cancel & Return Home
          </Link>
        </div>
      </form>
    </div>
  );
}
