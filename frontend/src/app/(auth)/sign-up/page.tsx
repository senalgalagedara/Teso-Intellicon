import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <div className="auth-header">
        <h1 className="gradient-text">Create an account</h1>
        <p className="auth-subtitle">
          Students get access immediately. Teacher accounts need an admin approval.
        </p>
      </div>

      <SignUpForm />

      <p className="auth-footer">
        Already registered? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  );
}
