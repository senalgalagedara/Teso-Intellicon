import React, { Suspense } from "react";
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
        <Link href="/" className="app-brand">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          Teso
        </Link>

        <nav className="app-nav" aria-label="Main">
          <span className="app-nav-label">Menu</span>
          <Suspense fallback={null}>
            <SidebarNav links={roleLinks(user.role)} />
          </Suspense>
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
  if (role === "student") {
    return [
      { href: "/", label: "Practice & Subjects" },
      { href: "/?tab=history", label: "Attempt History" },
    ];
  }

  const links: { href: string; label: string }[] = [{ href: "/", label: "Home" }];

  if (role === "teacher") {
    links.push({ href: "/teacher", label: "Courses" });
    links.push({ href: "/teacher/zscores", label: "Z-Scores" });
  }

  if (role === "teacher_pending") {
    links.push({ href: "/pending", label: "Approval" });
  }

  if (role === "admin") {
    links.push({ href: "/admin/subjects", label: "Subjects" });
    links.push({ href: "/admin/questions", label: "Question Pool" });
    links.push({ href: "/admin/questions/import", label: "Import CSV" });
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
