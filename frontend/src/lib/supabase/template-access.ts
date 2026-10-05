import "server-only";
// Template diagnostic routes must never use their service key to reach private papers.
export function templateBucketAllowed(bucket: string) {
  const template = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "app-storage";
  const assessment = process.env.ASSESSMENT_STORAGE_BUCKET || "teso-assessments";
  return bucket === template && bucket !== assessment;
}
export function templatePathAllowed(path: string) {
  return !path.startsWith("/") && !/[\\%:?#]/.test(path) && path.split("/").every(part => part !== "." && part !== "..");
}
