import CreateExamClient from "./CreateExamClient";
import { getHostPapers } from "@/app/actions/papers";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CreateExamPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const result = await getHostPapers(user.id);
  const papers = result.success ? (result.data ?? []) : [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <CreateExamClient papers={papers} hostId={user.id} />
    </div>
  );
}

