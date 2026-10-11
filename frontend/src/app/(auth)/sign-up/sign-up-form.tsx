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
      setAccountError("කරුණාකර පරිශීලක නාමයක් ඇතුළත් කරන්න.");
      setAccountPending(false);
      return;
    }

    if (rawUsername.length < 3) {
      setAccountError("පරිශීලක නාමය අවම වශයෙන් අක්ෂර 3 ක් විය යුතුය.");
      setAccountPending(false);
      return;
    }

    if (password !== confirm) {
      setAccountError("මුරපද එකිනෙකට නොගැලපේ.");
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
          duplicate: "මෙම පරිශීලක නාමය සහිත ගිණුමක් දැනටමත් පවතී. ඒ වෙනුවට ඇතුළු වීමට උත්සාහ කරන්න.",
          fallback: "මෙම පරිශීලක නාමය සමඟ ගිණුමක් සෑදීමට නොහැකි විය.",
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
          &larr; මුල් පිටුවට
        </Link>
      </div>

      <form onSubmit={handleAccountSubmit} className="auth-form">
        <label className="field">
          <span>සම්පූර්ණ නම</span>
          <input
            className="input"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="උදා: කමල් පෙරේරා"
            autoFocus
          />
        </label>

        <label className="field">
          <span>පරිශීලක නාමය</span>
          <input
            className="input"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            placeholder="උදා: kamal123"
          />
        </label>

        <label className="field">
          <span>මුරපදය</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="අවම වශයෙන් අක්ෂර 8 ක්"
          />
        </label>

        <label className="field">
          <span>මුරපදය තහවුරු කරන්න</span>
          <input
            className="input"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="මුරපදය නැවත ඇතුළත් කරන්න"
          />
        </label>

        {accountError ? <p className="form-error">{accountError}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={accountPending}>
          {accountPending ? "ගිණුම සාදමින්..." : "ශිෂ්‍ය ගිණුමක් ලියාපදිංචි කරන්න"}
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
