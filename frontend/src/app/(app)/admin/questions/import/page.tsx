import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { listAdminSubjects } from "@/lib/db/admin";
import { CsvImporter } from "./csv-importer";

export const dynamic = "force-dynamic";

export default async function AdminImportQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; subject?: string }>;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const targetSubjectId = params.subjectId || params.subject || "";

  const subjects = await listAdminSubjects();

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/admin/questions" className="back-link">
            &larr; Back to Question Pool
          </Link>
          <p className="eyebrow">Admin Management</p>
          <h1 style={{ marginTop: 6 }}>CSV Question Import & Approval</h1>
          <p className="page-subtitle">
            Upload question banks via CSV. Verify questions, 4 answer choices, and correct answer keys before approving into the pool.
          </p>
        </div>
      </div>

      <CsvImporter subjects={subjects} defaultSubjectId={targetSubjectId} />
    </>
  );
}
