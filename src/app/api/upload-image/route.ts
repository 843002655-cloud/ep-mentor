import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "无文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `pdf-${Date.now()}-${file.name || "page.jpg"}`;

    const { error } = await supabaseAdmin.storage
      .from("case-images")
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from("case-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
