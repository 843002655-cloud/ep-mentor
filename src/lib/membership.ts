import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";

export type MembershipPlan = "free" | "pro" | "institution";

const PLAN_DURATION_DAYS: Record<MembershipPlan, number> = {
  free: 0,
  pro: 365,
  institution: 365,
};

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("findUserIdByEmail:", error.message);
    return null;
  }
  const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
  return user?.id ?? null;
}

export async function activateMembership(input: {
  userId: string;
  plan: MembershipPlan;
  expiresAt?: string;
  paymentRef?: string;
}): Promise<{ plan: MembershipPlan; expires_at: string | null }> {
  const expiresAt =
    input.expiresAt ||
    (input.plan === "free"
      ? null
      : new Date(
          Date.now() + PLAN_DURATION_DAYS[input.plan] * 24 * 60 * 60 * 1000
        ).toISOString());

  const payload: Record<string, unknown> = {
    id: input.userId,
    plan: input.plan,
    plan_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (input.paymentRef) payload.last_payment_ref = input.paymentRef;

  const { error } = await supabaseAdmin.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("plan_expires_at") || lower.includes("last_payment_ref")) {
      const { error: fallbackError } = await supabaseAdmin.from("profiles").upsert(
        { id: input.userId, plan: input.plan, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (fallbackError) throw new Error(fallbackError.message);
    } else {
      throw new Error(error.message);
    }
  }

  return { plan: input.plan, expires_at: expiresAt };
}

export function verifyWeChatPaySignature(input: {
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
}): boolean {
  const apiKey = process.env.WECHAT_PAY_API_V3_KEY;
  if (!apiKey) return false;

  const message = `${input.timestamp}\n${input.nonce}\n${input.body}\n`;
  const expected = createHmac("sha256", apiKey).update(message).digest("base64");

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(input.signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseWeChatPayAttach(attach: string | undefined): {
  email?: string;
  plan?: MembershipPlan;
} {
  if (!attach) return {};
  try {
    return JSON.parse(attach) as { email?: string; plan?: MembershipPlan };
  } catch {
    if (attach.includes("@")) return { email: attach, plan: "pro" };
    return {};
  }
}
