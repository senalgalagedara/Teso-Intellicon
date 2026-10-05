import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { templateBucketAllowed, templatePathAllowed } from "@/lib/supabase/template-access";

export async function GET(req: NextRequest) {
  try {
    const requested = req.nextUrl.searchParams.get("bucket") || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "app-storage";
    if (!templateBucketAllowed(requested)) return NextResponse.json({ error: "Private content requires assessment-session authorisation" }, { status: 403 });
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        configured: false,
        files: [],
        message: "Supabase is not configured yet. Configure frontend/.env.local to load live storage files.",
      });
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "uploads";
    const bucket =
      searchParams.get("bucket") ||
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      "app-storage";

    if (!templatePathAllowed(folder)) return NextResponse.json({ error: "Invalid storage folder" }, { status: 422 });

    const supabase = getSupabaseServer();
    const info = await supabase.storage.getBucket(bucket);
    if (info.error || !info.data.public) return NextResponse.json({ error: "Template storage must use a public bucket" }, { status: 403 });
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 50,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const files = (data || [])
      .filter((item) => item.name !== ".emptyFolderPlaceholder")
      .map((item) => {
        const fullPath = folder ? `${folder}/${item.name}` : item.name;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fullPath);
        return {
          id: item.id,
          name: item.name,
          fullPath,
          size: item.metadata?.size,
          created_at: item.created_at,
          publicUrl: urlData.publicUrl,
        };
      });

    return NextResponse.json({ configured: true, files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
