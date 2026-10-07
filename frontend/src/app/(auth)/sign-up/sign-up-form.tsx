"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { finishSignUpAction, type ActionState } from "@/app/actions/auth";
import { authClient } from "@/lib/auth/client";
import { authErrorText } from "@/lib/auth/client-errors";
import { SubmitButton } from "@/components/submit-button";

const INITIAL_STATE: ActionState = {};

/**
 * Sign-up runs in two steps on purpose.
 *
 * The account itself is created through the browser client so the session
 * cookie is set on the HTTP response. Only then does the second step hand the
 * chosen role to a Server Action, which re-reads the session and decides what
 * to store. The role is never taken from the form at face value: the action
 * accepts only "student" or "teacher", and an account that already has a
 * decided role is sent straight to the dashboard.
 */
export function SignUpForm() {
  const router = useRouter();
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountPending, setAccountPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const [state, roleAction] = useActionState<ActionState, FormData>(
    finishSignUpAction,
    INITIAL_STATE,
  );

  async function handleAccountSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError(null);
    setAccountPending(true);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setAccountError("Those passwords do not match.");
      setAccountPending(false);
      return;
    }

    let error: unknown = null;
    try {
      ({ error } = await authClient.signUp.email({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password,
      }));
    } catch (e) {
      error = e;
    }

    if (error) {
      setAccountError(
        authErrorText(error, {
          duplicate: "An account with this email already exists. Try signing in instead.",
          fallback: "Could not create that account.",
        }),
      );
      setAccountPending(false);
      return;
    }

    setAccountPending(false);
    setAccountCreated(true);
    router.refresh();
  }

  if (!accountCreated) {
    return (
      <form onSubmit={handleAccountSubmit} className="auth-form">
        <label className="field">
          <span>Full name</span>
          <input className="input" name="name" autoComplete="name" required maxLength={120} />
        </label>

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
            autoComplete="new-password"
            required
            minLength={8}
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
          />
        </label>

        {accountError ? <p className="form-error">{accountError}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={accountPending}>
          {accountPending ? "Creating account..." : "Create account"}
        </button>
      </form>
    );
  }

  return (
    <form action={roleAction} className="auth-form">
      <p className="auth-subtitle">
        Account created. How will you use the platform?
      </p>

      <label className="choice">
        <input type="radio" name="role" value="student" defaultChecked />
        <span>
          <strong>Student</strong>
          <small>Join courses a teacher invites you to. Access is immediate.</small>
        </span>
      </label>

      <label className="choice">
        <input type="radio" name="role" value="teacher" />
        <span>
          <strong>Teacher</strong>
          <small>Create courses and invite students. Needs an admin approval first.</small>
        </span>
      </label>

      <label className="field">
        <span>Note for the admin (optional)</span>
        <textarea
          className="textarea"
          name="note"
          maxLength={500}
          placeholder="Subject you teach, experience, anything that helps us review."
        />
      </label>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <SubmitButton pendingLabel="Saving...">Continue</SubmitButton>
    </form>
  );
}
