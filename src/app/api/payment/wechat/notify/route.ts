import { NextRequest, NextResponse } from "next/server";
import {
  activateMembership,
  findUserIdByEmail,
  parseWeChatPayAttach,
  verifyWeChatPaySignature,
} from "@/lib/membership";

interface WeChatPayNotification {
  id?: string;
  create_time?: string;
  resource_type?: string;
  event_type?: string;
  summary?: string;
  resource?: {
    ciphertext?: string;
    nonce?: string;
    associated_data?: string;
  };
}

interface WeChatPayTransaction {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  attach?: string;
  payer?: { openid?: string };
  amount?: { total?: number; payer_total?: number };
}

function decryptResource(): WeChatPayTransaction | null {
  return null;
}

function wechatSuccessResponse() {
  return NextResponse.json({ code: "SUCCESS", message: "成功" });
}

function wechatFailResponse(message: string) {
  return NextResponse.json({ code: "FAIL", message }, { status: 400 });
}

// POST /api/payment/wechat/notify — 微信支付结果回调
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("wechatpay-timestamp") || "";
    const nonce = request.headers.get("wechatpay-nonce") || "";
    const signature = request.headers.get("wechatpay-signature") || "";

    if (process.env.WECHAT_PAY_API_V3_KEY) {
      const valid = verifyWeChatPaySignature({ timestamp, nonce, body: rawBody, signature });
      if (!valid) {
        console.error("WeChat pay notify: invalid signature");
        return wechatFailResponse("签名验证失败");
      }
    }

    let payload: WeChatPayNotification;
    try {
      payload = JSON.parse(rawBody) as WeChatPayNotification;
    } catch {
      return wechatFailResponse("无效的 JSON");
    }

    if (payload.event_type !== "TRANSACTION.SUCCESS") {
      return wechatSuccessResponse();
    }

    let transaction = decryptResource();

    if (!transaction && process.env.WECHAT_PAY_NOTIFY_DEBUG === "true") {
      try {
        const debug = JSON.parse(rawBody) as { transaction?: WeChatPayTransaction };
        transaction = debug.transaction ?? null;
      } catch {
        transaction = null;
      }
    }

    if (!transaction) {
      console.warn("WeChat pay notify: resource decryption not implemented, skipping auto-activate");
      return wechatSuccessResponse();
    }

    if (transaction.trade_state !== "SUCCESS") {
      return wechatSuccessResponse();
    }

    const attach = parseWeChatPayAttach(transaction.attach);
    if (!attach.email) {
      console.error("WeChat pay notify: missing email in attach");
      return wechatSuccessResponse();
    }

    const userId = await findUserIdByEmail(attach.email);
    if (!userId) {
      console.error("WeChat pay notify: user not found for", attach.email);
      return wechatSuccessResponse();
    }

    await activateMembership({
      userId,
      plan: attach.plan || "pro",
      paymentRef: transaction.transaction_id || transaction.out_trade_no,
    });

    return wechatSuccessResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "处理失败";
    console.error("POST /api/payment/wechat/notify:", message);
    return wechatFailResponse(message);
  }
}
