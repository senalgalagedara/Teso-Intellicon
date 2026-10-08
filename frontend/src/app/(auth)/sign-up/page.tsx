import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <div className="auth-header">
        <h1>ශිෂ්‍ය ලියාපදිංචිය</h1>
        <p className="auth-subtitle">
          අසීමිත පුහුණුව වහාම ආරම්භ කිරීමට පරිශීලක නාමයක් සහ මුරපදයක් සමඟ ලියාපදිංචි වන්න.
        </p>
      </div>

      <SignUpForm />

      <p className="auth-footer">
        දැනටමත් ලියාපදිංචි වී තිබේද? <Link href="/sign-in">ඇතුළු වන්න</Link>
      </p>
    </>
  );
}
