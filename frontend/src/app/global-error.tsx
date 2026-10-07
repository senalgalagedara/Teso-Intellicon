"use client";

import { useEffect } from "react";

const styles = {
  html: {
    height: "100%",
  },
  body: {
    height: "100%",
    margin: 0,
    background: "#F8FAFC",
    color: "#0F172A",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    WebkitFontSmoothing: "antialiased",
  },
  main: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    textAlign: "center" as const,
  },
  eyebrow: {
    margin: 0,
    fontSize: "0.875rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "#4F46E5",
  },
  heading: {
    margin: "0.75rem 0 1rem",
    fontSize: "1.75rem",
    lineHeight: 1.2,
  },
  lede: {
    margin: "0 auto 1.5rem",
    maxWidth: "32rem",
    fontSize: "1rem",
    lineHeight: 1.6,
    color: "#64748B",
  },
  button: {
    border: "none",
    borderRadius: "10px",
    padding: "0.625rem 1.25rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#FFFFFF",
    background: "#4F46E5",
    cursor: "pointer",
  },
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={styles.body}>
        <main style={styles.main}>
          <p style={styles.eyebrow}>Teso</p>
          <h1 style={styles.heading}>Something went wrong</h1>
          <p style={styles.lede}>
            This page hit an unexpected problem while loading. Try again — if it keeps
            happening, sign out and back in.
          </p>
          <button type="button" style={styles.button} onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}