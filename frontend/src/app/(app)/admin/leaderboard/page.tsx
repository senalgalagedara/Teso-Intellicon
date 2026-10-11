import React from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import {
  listAdminSubjects,
  listSubjectLeaderboard,
  getLeaderboardStats,
} from "@/lib/db/admin";
import { LeaderboardClient } from "./leaderboard-client";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const currentSubjectId = params.subject || "";

  const subjects = await listAdminSubjects();
  const entries = await listSubjectLeaderboard(currentSubjectId || undefined);
  const stats = await getLeaderboardStats(currentSubjectId || undefined);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Management</p>
          <h1 style={{ marginTop: 8 }}>High Score Leaderboard</h1>
          <p className="page-subtitle">
            View student high scores, top ranks, and academic performance benchmarks for each subject.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/students" className="btn btn-primary">
            Registered Students
          </Link>
          <Link href="/admin/subjects" className="btn btn-secondary">
            Subjects
          </Link>
          <Link href="/admin/questions" className="btn btn-secondary">
            Question Pool
          </Link>
        </div>
      </div>

      <LeaderboardClient
        subjects={subjects}
        currentSubjectId={currentSubjectId}
        entries={entries}
        stats={stats}
      />
    </>
  );
}
