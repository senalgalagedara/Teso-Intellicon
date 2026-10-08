import { getTermTestMarks } from "@/app/actions/term-test";
import { getTuitionExams } from "@/app/actions/exam";
import { MarksClient } from "@/components/marks/MarksClient";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AnalysePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !currentUser.id) {
    redirect("/auth/sign-in");
  }

  const dbUser = await prisma.user.findUnique({ where: { id: currentUser.id } });
  const user = { id: currentUser.id, subjects: dbUser?.subjects || [] };

  const termTests = await getTermTestMarks(user.id);
  const tuitionExams = await getTuitionExams(user.id);

  return (
    <div className="min-h-screen bg-background text-foreground py-6 md:py-8 transition-colors duration-200">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <MarksClient
          user={user}
          initialTermTests={termTests}
          initialTuitionExams={tuitionExams}
        />
      </div>
    </div>
  );
}