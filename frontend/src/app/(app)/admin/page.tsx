import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  await requireRole("admin");
  redirect("/admin/subjects");
}
