import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, ROLE_LABELS } from "@/lib/auth/dal";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/components/sidebar-nav";

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
      <aside className="app-sidebar">
        <Link href="/dashboard" className="app-brand">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          Teso
        </Link>

        <nav className="app-nav" aria-label="Main">
          <span className="app-nav-label">Menu</span>
          <SidebarNav links={roleLinks(user.role)} />
        </nav>

        <div className="sidebar-foot">
          <span className={`badge ${roleBadgeClass(user.role)}`}>{ROLE_LABELS[user.role]}</span>
          <span className="sidebar-user" title={user.email}>
            {user.name}
          </span>
          <SignOutButton />
        </div>
      </aside>

      <div className="app-main">
        <main className="container">{children}</main>
      </div>
    </div>
  );
}

function roleLinks(role: string): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [{ href: "/dashboard", label: "Overview" }];

  if (role === "student") {
    links.push(
      { href: "/student", label: "My courses" },
      { href: "/exams/self-assessment", label: "Self-assessment" },
    );
  }

  if (role === "teacher") {
    links.push({ href: "/teacher", label: "My courses" });
  }

  if (role === "teacher_pending") {
    links.push({ href: "/pending", label: "Approval" });
  }

  if (role === "admin") {
    links.push({ href: "/admin/teachers", label: "Teacher approvals" });
  }

  return links;
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
