import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseServerConfigured } from "@/lib/supabase/server";

export async function GET() {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        configured: false,
        notes: [
          {
            id: "demo-1",
            title: "Template Demo Note (Supabase offline)",
            content: "Configure your SUPABASE_URL and SUPABASE_ANON_KEY in .env.local to persist real PostgreSQL records.",
            ai_category: "Quickstart",
            created_at: new Date().toISOString(),
          },
          {
            id: "demo-2",
            title: "FastAPI AI Engine Hook",
            content: "You can send notes to FastAPI's /api/ai/analyze endpoint to categorize and extract insights automatically.",
            ai_category: "Architecture",
            created_at: new Date().toISOString(),
          }
        ],
      });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configured: true, notes: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, ai_category } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        configured: false,
        message: "Note simulated locally because Supabase is not configured.",
        note: {
          id: `simulated-${Date.now()}`,
          title,
          content,
          ai_category: ai_category || "General",
          created_at: new Date().toISOString(),
        },
      });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("notes")
      .insert({ title, content, ai_category: ai_category || "General" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configured: true, note: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
