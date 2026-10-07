import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teso Intellicon",
  description: "Course platform with admin-approved teacher accounts.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <Link href="/" className="auth-brand">
          <span className="brand-mark brand-mark-lg" aria-hidden="true">
            T
          </span>
          Teso Intellicon
        </Link>
        <main className="card auth-card">{children}</main>
      </div>
    </div>
  );
}
