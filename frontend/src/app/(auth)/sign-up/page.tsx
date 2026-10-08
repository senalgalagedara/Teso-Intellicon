import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <div className="auth-header">
        <h1>Student Registration</h1>
        <p className="auth-subtitle">
          Register with a username and password to start unlimited practice immediately.
        </p>
      </div>

      <SignUpForm />

      <p className="auth-footer">
        Already registered? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  );
}
