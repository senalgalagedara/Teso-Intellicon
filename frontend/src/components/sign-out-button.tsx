"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { authErrorText } from "@/lib/auth/client-errors";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);

    try {
      const { error: signOutError } = await authClient.signOut();

      if (signOutError) {
        setError(authErrorText(signOutError, { fallback: "Could not sign you out. Please try again." }));
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch (e) {
      setError(authErrorText(e, { fallback: "Could not sign you out. Please try again." }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={handleSignOut}
        disabled={pending}
      >
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
