import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/api-utils";
import { activateMembership, findUserIdByEmail } from "@/lib/membership";
import { formatZodErrors, membershipActivateSchema } from "@/lib/validators";

// POST /api/membership/activate — 管理员手动开通会员
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request.headers.get("cookie") || ""))) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = membershipActivateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "数据格式错误", details: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const userId = await findUserIdByEmail(parsed.data.email);
    if (!userId) {
      return NextResponse.json({ error: "未找到该邮箱对应的用户" }, { status: 404 });
    }

    const result = await activateMembership({
      userId,
      plan: parsed.data.plan,
      expiresAt: parsed.data.expiresAt,
      paymentRef: `manual:${Date.now()}`,
    });

    return NextResponse.json({
      ok: true,
      email: parsed.data.email,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "开通失败";
    console.error("POST /api/membership/activate:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
