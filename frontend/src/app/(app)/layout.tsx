import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, ROLE_LABELS } from "@/lib/auth/dal";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // proxy.ts already bounces anonymous requests; this closes the gap for a
  // session that expired between the proxy check and this render.
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="app-shell">
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />

      <header className="app-header">
        <Link href="/dashboard" className="app-brand">
          <span className="gradient-text">Teso Intellicon</span>
        </Link>

        <nav className="app-nav">
          <RoleNav role={user.role} />
        </nav>

        <div className="app-user">
          <span className={`badge ${roleBadgeClass(user.role)}`}>{ROLE_LABELS[user.role]}</span>
          <span className="app-user-name">{user.name}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="container">{children}</main>
    </div>
  );
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "badge-red";
    case "teacher":
      return "badge-blue";
    case "teacher_pending":
      return "badge-yellow";
    default:
      return "badge-green";
  }
}

function RoleNav({ role }: { role: string }) {
  const links: { href: string; label: string }[] = [{ href: "/dashboard", label: "Overview" }];

  if (role === "student") {
    links.push({ href: "/student", label: "Courses" });
    links.push({ href: "/student/practice", label: "Practice" });
    links.push({ href: "/student/review", label: "Reviews" });
    links.push({ href: "/student/progress", label: "Progress" });
  }

  if (role === "teacher") {
    links.push({ href: "/teacher", label: "Courses" });
    links.push({ href: "/teacher/zscores", label: "Z-Scores" });
  }

  if (role === "teacher_pending") {
    links.push({ href: "/pending", label: "Approval" });
  }

  if (role === "admin") {
    links.push({ href: "/admin/teachers", label: "Teacher approvals" });
  }

  return (
    <>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="app-nav-link">
          {link.label}
        </Link>
      ))}
    </>
  );
}
