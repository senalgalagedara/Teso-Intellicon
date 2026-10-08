import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlanClient } from "./PlanClient";

export default async function PlanPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !currentUser.id) {
    redirect("/auth/sign-in");
  }

  return <PlanClient userId={currentUser.id} />;
}