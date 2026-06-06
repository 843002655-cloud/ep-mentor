import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/api-utils";

// GET /api/cases — list cases (public: published only; admin: all)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const admin = await isAdmin(request.headers.get("cookie") || "");

  let query = supabaseAdmin
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  if (!admin) query = query.eq("is_published", true);
  if (category) query = query.eq("category", category);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data } = await query;
  return NextResponse.json({ cases: data || [] });
}

// POST /api/cases — admin create case
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request.headers.get("cookie") || ""))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await request.json();
  const { error, data } = await supabaseAdmin.from("cases").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ case: data });
}
