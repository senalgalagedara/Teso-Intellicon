import { redirect } from "next/navigation";

export default async function StandaloneSelfAssessmentPage({
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
