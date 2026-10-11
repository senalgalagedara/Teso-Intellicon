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
        setError(authErrorText(signOutError, { fallback: "ඉවත් වීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න." }));
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch (e) {
      setError(authErrorText(e, { fallback: "ඉවත් වීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න." }));
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
        {pending ? "ඉවත් වෙමින්..." : "ඉවත් වන්න"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
