import AddPaperClient from "./AddPaperClient";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AddPaperPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AddPaperClient hostId={user.id} />
    </div>
  );
}

