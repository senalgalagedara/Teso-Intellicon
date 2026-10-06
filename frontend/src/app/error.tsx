"use client";

import { useEffect } from "react";

/**
 * Root error boundary: catches unexpected runtime errors from any page segment.
 * Server errors arrive here with a generic message plus a `digest` that matches
 * the server-side log entry; client errors show their original message.
 */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <main className="container" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ margin: "3rem auto", maxWidth: "32rem", textAlign: "center" }}>
        <p className="eyebrow" style={{ justifyContent: "center" }}>Something went wrong</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginTop: "0.5rem" }}>
          This page hit an unexpected error
        </h1>
        <p className="page-subtitle">
          Try that again — if it keeps failing, your changes are safe and you can contact support
          {error.digest ? <> (error code: <code>{error.digest}</code>)</> : null}.
        </p>
        <button type="button" className="btn btn-primary" onClick={retry} style={{ marginTop: "1.25rem" }}>
          Try again
        </button>
      </div>
    </main>
  );
}