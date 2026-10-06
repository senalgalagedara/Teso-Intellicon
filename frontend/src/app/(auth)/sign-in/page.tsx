import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <>
      <div className="auth-header">
        <h1>Sign in</h1>
        <p className="auth-subtitle">Use the email and password for your account.</p>
      </div>

      <SignInForm />

      <p className="auth-footer">
        No account yet? <Link href="/sign-up">Create one</Link>
      </p>
    </>
  );
}
