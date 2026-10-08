import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <>
      <div className="auth-header">
        <h1>ඇතුළු වන්න</h1>
        <p className="auth-subtitle">ඔබගේ ගිණුමේ පරිශීලක නාමය සහ මුරපදය භාවිතා කරන්න.</p>
      </div>

      <SignInForm />

      <p className="auth-footer">
        තවමත් ගිණුමක් නැද්ද? <Link href="/sign-up">ශිෂ්‍ය ගිණුමක් සාදන්න</Link>
      </p>
    </>
  );
}
