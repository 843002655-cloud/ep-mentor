import { NextRequest, NextResponse } from "next/server";
import { fetchAdminAnalytics, parseAnalyticsDays } from "@/lib/admin-analytics";
import { isAdmin } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  if (!(await isAdmin(cookieHeader))) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseAnalyticsDays(searchParams.get("days") || undefined);

  try {
    const analytics = await fetchAdminAnalytics(days);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "数据加载失败" }, { status: 500 });
  }
}
