import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "无文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    // Sanitize filename: remove Chinese characters and special chars
    const safeName = (file.name || "page.jpg")
      .replace(/[^\x00-\x7F]/g, "")  // remove non-ASCII
      .replace(/[^a-zA-Z0-9._-]/g, "_") // replace special chars
      .replace(/_{2,}/g, "_") // collapse multiple underscores
      || "image.jpg";
    const fileName = `pdf-${Date.now()}-${safeName}`;

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
