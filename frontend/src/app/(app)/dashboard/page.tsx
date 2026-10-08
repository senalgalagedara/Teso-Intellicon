import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) || {};
  if (tab === "history") {
    redirect("/?tab=history");
  }
  redirect("/");
}
