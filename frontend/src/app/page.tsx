import Link from "next/link";
import { getCurrentUser, ROLE_LABELS } from "@/lib/auth/dal";
import { SignOutButton } from "@/components/sign-out-button";
import SelfAssessmentDashboard from "@/components/self-assessment-dashboard";
import { getAdminOverviewStats } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) || {};
  const activeTab = tab === "history" ? "history" : "practice";
  const user = await getCurrentUser();

  let adminStats: { subjectCount: number; questionCount: number } | null = null;
  if (user?.role === "admin") {
    try {
      adminStats = await getAdminOverviewStats();
    } catch {
      // safe fallback
    }
  }

  return (
    <>
      {/* SITE HEADER */}
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="app-brand">
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            Teso Intellicon
          </Link>

          <nav className="site-nav" aria-label="Site">
            {/* IN HEADER: INSTEAD OF EXAMS, SHOW ATTEMPT HISTORY */}
            <Link
              href="/?tab=history"
              className={activeTab === "history" ? "active" : ""}
              style={{ fontWeight: activeTab === "history" ? 700 : 500 }}
            >
              Attempt History
            </Link>

            {user?.role === "admin" && (
              <>
                <Link href="/admin/subjects">Subjects</Link>
                <Link href="/admin/questions">Question Pool</Link>
                <Link href="/admin/questions/import">Import CSV</Link>
              </>
            )}

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "8px" }}>
                <span className={`badge ${roleBadgeClass(user.role)}`}>
                  {ROLE_LABELS[user.role]}
                </span>
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{user.name}</span>
                <SignOutButton />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
                <Link href="/sign-in" className="btn btn-secondary btn-sm">
                  Sign in
                </Link>
                <Link href="/sign-up" className="btn btn-primary btn-sm">
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingTop: "24px" }}>
        {/* ADMIN OVERVIEW SHORTCUT (IF ADMIN) */}
        {user?.role === "admin" && adminStats && (
          <section className="card" style={{ marginBottom: "28px", borderColor: "#c7d2fe", background: "#f8faff" }}>
            <div className="row-between" style={{ flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--primary)" }}>Admin Portal Overview</span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "2px 0 6px" }}>
                  System Management
                </h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span className="badge badge-neutral">Total Subjects: {adminStats.subjectCount}</span>
                  <span className="badge badge-green">Questions in Pool: {adminStats.questionCount}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Link href="/admin/subjects" className="btn btn-primary btn-sm">
                  Manage Subjects
                </Link>
                <Link href="/admin/questions" className="btn btn-secondary btn-sm">
                  Question Pool
                </Link>
                <Link href="/admin/questions/import" className="btn btn-secondary btn-sm">
                  Import CSV
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* SELF ASSESSMENT & PRACTICE DASHBOARD ON HOME PAGE */}
        <SelfAssessmentDashboard
          showTopNav={false}
          embedded={false}
          initialTab={activeTab}
          initialUserName={user?.name}
          initialUserEmail={user?.email}
        />
      </main>
    </>
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
