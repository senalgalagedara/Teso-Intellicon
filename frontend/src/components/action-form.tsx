"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/actions/auth";

const INITIAL_STATE: ActionState = {};

/**
 * Thin wrapper that binds a Server Action to `useActionState` and renders its
 * error and success messages. The action still runs its own role check on the
 * server; hiding the button is presentation only.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, INITIAL_STATE);

  return (
    <form action={formAction} className={className} key={resetOnSuccess ? state.success : undefined}>
      {children}
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
