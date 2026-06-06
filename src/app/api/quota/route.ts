import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const FREE_LIMIT = 20;
const ANON_LIMIT = 3;

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieHeader.split("; ").map((c) => {
            const [name, ...rest] = c.split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id || null;
  const today = new Date().toISOString().split("T")[0];
  const limit = userId ? FREE_LIMIT : ANON_LIMIT;

  const { data } = await supabase
    .from("usage_logs")
    .select("chat_count")
    .eq(userId ? "user_id" : "ip_address", userId || ip)
    .eq("date", today)
    .maybeSingle();

  const used = data?.chat_count || 0;

  return NextResponse.json({
    used,
    remaining: Math.max(0, limit - used),
    total: limit,
  });
}
