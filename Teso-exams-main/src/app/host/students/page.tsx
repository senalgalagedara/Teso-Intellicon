import React from "react";
import HostStudentsPageClientWrapper from "./HostStudentsPageClientWrapper";
import { getHostCandidates } from "@/app/actions/papers";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HostStudentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }


  const result = await getHostCandidates(user.id);
  const candidates = result.success ? (result.data ?? []) : [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <HostStudentsPageClientWrapper initialCandidates={candidates} hostId={user.id} />
    </div>
  );
}
