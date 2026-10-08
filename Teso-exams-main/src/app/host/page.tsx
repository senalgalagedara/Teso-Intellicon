import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HostDashboardPage() {
  const user = await getCurrentUser();
  if (user?.role === "STUDENT") {
    redirect("/host/candidates");
  }
  redirect("/host/create");
}
