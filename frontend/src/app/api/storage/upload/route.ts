import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { templateBucketAllowed, templatePathAllowed } from "@/lib/supabase/template-access";

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          error: "Supabase credentials are not configured.",
          hint: "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to frontend/.env.local",
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";
    const bucket =
      (formData.get("bucket") as string) ||
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      "app-storage";

    if (!templateBucketAllowed(bucket)) return NextResponse.json({ error: "Private content requires assessment-session authorisation" }, { status: 403 });
    if (!templatePathAllowed(folder)) return NextResponse.json({ error: "Invalid storage folder" }, { status: 422 });

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const info = await supabase.storage.getBucket(bucket);
    if (info.error || !info.data.public) return NextResponse.json({ error: "Template storage must use a public bucket" }, { status: 403 });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${folder}/${Date.now()}-${sanitizedName}`;

    const { data, error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    // Also optionally record metadata into public.documents table if it exists
    try {
      await supabase.from("documents").insert({
        title: file.name,
        storage_path: data.path,
        file_size: file.size,
        mime_type: file.type,
      });
    } catch {
      // Non-fatal if documents table has not been created yet
    }

    return NextResponse.json({
      success: true,
      path: data.path,
      publicUrl: urlData.publicUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
