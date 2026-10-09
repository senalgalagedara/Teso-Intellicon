import React from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { listRegisteredStudents } from "@/lib/db/admin";
import { StudentsClient } from "./students-client";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  await requireRole("admin");

  const students = await listRegisteredStudents();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin Management</p>
          <h1 style={{ marginTop: 8 }}>Registered Students</h1>
          <p className="page-subtitle">
            View all enrolled students, their registration status, and academic practice activity across subjects.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/leaderboard" className="btn btn-primary">
            High Score Leaderboard
          </Link>
          <Link href="/admin/subjects" className="btn btn-secondary">
            Subjects
          </Link>
          <Link href="/admin/questions" className="btn btn-secondary">
            Question Pool
          </Link>
        </div>
      </div>

      <StudentsClient students={students} />
    </>
  );
}
