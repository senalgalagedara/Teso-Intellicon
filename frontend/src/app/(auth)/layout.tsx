import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teso Intellicon",
  description: "Course platform with admin-approved teacher accounts.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      <main className="auth-card glass-card">{children}</main>
    </div>
  );
}
