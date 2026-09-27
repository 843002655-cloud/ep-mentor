import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import { createServerClient } from "@supabase/ssr";
import { deepseek, DEEPSEEK_MODEL } from "@/lib/deepseek";
import {
  TEACHING_MAX_TOKENS,
  TEACHING_TEMPERATURE,
  appendDirectAnswerInstruction,
  buildFigureIntroPrompt,
  buildSystemPrompt,
  buildVisionTeachingSystemPrompt,
} from "@/lib/chat-prompts";
import {
  appendStreamMeta,
  inferReplyMeta,
  normalizeTeachingState,
  updateTeachingState,
  type TeachingState,
} from "@/lib/teaching-state";
import { getUserPlan } from "@/lib/membership";

const ANON_LIMIT = 20;

const VISION_MODEL = process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max";

function getBailian() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
}

function resolveImageUrl(url: string, request: NextRequest): string {
  if (/^https?:\/\//i.test(url)) return url;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
}

function visionAvailable(currentFigure?: Record<string, unknown>): boolean {
  return Boolean(getBailian() && currentFigure?.image_url);
}

function isVisionApiError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  const msg = e.message || "";
  return (
    e.status === 401 ||
    e.status === 403 ||
    /incorrect api key|apikey-error|invalid_api_key/i.test(msg)
  );
}

function getSupabase(cookieHeader: string, serviceRole = false) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
}

async function checkAndIncrementQuota(
  userId: string | null,
  ip: string,
  cookieHeader: string
): Promise<{ allowed: boolean; remaining: number; total: number }> {
  const today = new Date().toISOString().split("T")[0];
  const limit = ANON_LIMIT;

  // Pro / 机构会员：不限次数
  if (userId) {
    const plan = await getUserPlan(userId);
    if (plan === "pro" || plan === "institution") {
      return { allowed: true, remaining: 999, total: 999 };
    }
  }

  const supabaseAdmin = getSupabase(cookieHeader, true);

  // 免费注册用户按 user_id、匿名用户按 IP 计数
  const keyField = userId ? "user_id" : "ip_address";
  const keyValue = userId || ip;

  const { data: existing } = await supabaseAdmin
    .from("usage_logs")
    .select("chat_count")
    .eq(keyField, keyValue)
    .eq("date", today)
    .maybeSingle();

  const current = existing?.chat_count || 0;
  if (current >= limit) {
    return { allowed: false, remaining: 0, total: limit };
  }

  const newCount = current + 1;
  if (userId) {
    const { error } = await supabaseAdmin.from("usage_logs").upsert(
      { date: today, chat_count: newCount, user_id: userId },
      { onConflict: "user_id,date" }
    );
    if (error) console.error("Quota upsert error:", error);
  } else {
    const { error } = await supabaseAdmin.from("usage_logs").upsert(
      { date: today, chat_count: newCount, ip_address: ip },
      { onConflict: "ip_address,date" }
    );
    if (error) console.error("Quota upsert error:", error);
  }

  return { allowed: true, remaining: limit - newCount, total: limit };
}

function mapConversationMessages(messages: Array<{ role: string; content: string }>) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));
}

function buildVisionContextMessage(
  currentFigure: Record<string, unknown>,
  request: NextRequest
): ChatCompletionMessageParam {
  const imageUrl = resolveImageUrl(String(currentFigure.image_url), request);
  return {
    role: "user",
    content: [
      {
        type: "text",
        text: `【当前步骤图片：${currentFigure.figure_number || ""} ${currentFigure.title || ""}】请结合此图进行苏格拉底式引导，优先让学员自己描述观察到的特征。`,
      },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
  };
}

async function createTeachingCompletion(params: {
  useVision: boolean;
  systemPrompt: string;
  conversationMessages: ChatCompletionMessageParam[];
  currentFigure?: Record<string, unknown>;
  request: NextRequest;
  stream: boolean;
}) {
  const run = (withVision: boolean) => {
    const { systemPrompt, conversationMessages, currentFigure, request, stream } = params;
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
    ];

    if (withVision && currentFigure?.image_url) {
      messages.push(buildVisionContextMessage(currentFigure, request));
    }

    const client = withVision ? getBailian() : null;
    const model = withVision && client ? VISION_MODEL : DEEPSEEK_MODEL;
    const ai = withVision && client ? client : deepseek;

    return ai.chat.completions.create({
      model,
      max_tokens: TEACHING_MAX_TOKENS,
      temperature: TEACHING_TEMPERATURE,
      stream,
      ...(stream ? {} : { response_format: { type: "json_object" as const } }),
      messages,
    });
  };

  if (!params.useVision) return run(false);

  try {
    return await run(true);
  } catch (err) {
    if (isVisionApiError(err)) {
      console.warn("Vision API failed, falling back to DeepSeek:", (err as Error).message);
      return run(false);
    }
    throw err;
  }
}

function jsonOutputInstructions(): string {
  return `

# Output Format
严格按照以下 JSON 格式输出，不要包含任何其他内容：
{
  "status": "questioning",
  "content": "你的提问或评价文本",
  "hint": "仅在 status 为 hinting 时填写提示内容，否则留空字符串"
}

status 取值：questioning（引导提问）| hinting（方向性提示）| confirming（肯定并过渡）`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      caseContext,
      messages,
      stream = false,
      currentFigure,
      figureIntro = false,
      figureIndex = 0,
      figureTotal = 1,
      teachingState: rawTeachingState,
    } = body;

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const supabase = getSupabase(cookieHeader);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const quota =
      figureIntro && currentFigure
        ? { allowed: true, remaining: 999, total: 999 }
        : await checkAndIncrementQuota(userId, ip, cookieHeader);

    if (!quota.allowed) {
      return NextResponse.json(
        { error: `今日对话次数已达上限（${quota.total}次），请明天再来`, quota },
        { status: 429 }
      );
    }

    const conversationMessages = mapConversationMessages(messages || []);
    const lastUserMessage =
      [...conversationMessages].reverse().find((m) => m.role === "user")?.content || "";

    let teachingState: TeachingState = normalizeTeachingState(rawTeachingState, figureIndex);
    if (!figureIntro && lastUserMessage) {
      teachingState = updateTeachingState(teachingState, String(lastUserMessage), {
        figureIndex,
      });
    } else {
      teachingState = { ...teachingState, figureIndex };
    }

    const useVision = visionAvailable(currentFigure);

    if (figureIntro && stream && currentFigure) {
      const runFigureIntro = (withVision: boolean) => {
        const systemPrompt = buildFigureIntroPrompt(
          caseContext,
          currentFigure,
          figureIndex,
          figureTotal,
          withVision
        );

        const introMessages: ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          ...conversationMessages.slice(-6),
          { role: "user", content: "请给出这一步的苏格拉底式教学开场。" },
        ];

        if (withVision) {
          introMessages.push(buildVisionContextMessage(currentFigure, request));
        }

        const bailian = withVision ? getBailian() : null;
        const client = withVision && bailian ? bailian : deepseek;
        const model = withVision && bailian ? VISION_MODEL : DEEPSEEK_MODEL;

        return client.chat.completions.create({
          model,
          max_tokens: 600,
          temperature: TEACHING_TEMPERATURE,
          stream: true,
          messages: introMessages,
        });
      };

      let streamResponse;
      try {
        streamResponse = await runFigureIntro(useVision);
      } catch (err) {
        if (useVision && isVisionApiError(err)) {
          console.warn("Figure intro vision failed, falling back to DeepSeek:", (err as Error).message);
          streamResponse = await runFigureIntro(false);
        } else {
          throw err;
        }
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let fullText = "";
            for await (const chunk of streamResponse) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(delta));
              }
            }
            const meta = inferReplyMeta("", fullText, teachingState);
            controller.enqueue(encoder.encode(appendStreamMeta("", meta)));
          } catch (err) {
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const baseSystemPrompt = useVision
      ? buildVisionTeachingSystemPrompt(caseContext, currentFigure || {}, {
          figureIndex,
          teachingState,
        })
      : buildSystemPrompt(caseContext, currentFigure, {
          figureIndex,
          teachingState,
          visionEnabled: false,
        });
    const systemPrompt = appendDirectAnswerInstruction(baseSystemPrompt, lastUserMessage);

    // useVision 仅用于提示词；实际调用在 createTeachingCompletion 内自动降级
    const requestVision = useVision;

    if (stream) {
      const streamResponse = await createTeachingCompletion({
        useVision: requestVision,
        systemPrompt,
        conversationMessages,
        currentFigure,
        request,
        stream: true,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullText = "";
          try {
            for await (const chunk of streamResponse as AsyncIterable<{
              choices: Array<{ delta?: { content?: string } }>;
            }>) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(delta));
              }
            }
            const meta = inferReplyMeta(String(lastUserMessage), fullText, teachingState);
            controller.enqueue(encoder.encode(appendStreamMeta("", meta)));
          } catch (e) {
            console.error("Stream error:", e);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const response = await createTeachingCompletion({
      useVision: requestVision,
      systemPrompt: systemPrompt + jsonOutputInstructions(),
      conversationMessages,
      currentFigure,
      request,
      stream: false,
    });

    const raw =
      (response as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content ||
      "{}";
    let reply = raw;
    let status = "questioning";
    let hint = "";
    try {
      const parsed = JSON.parse(raw);
      reply = parsed.content || raw;
      status = parsed.status || "questioning";
      hint = parsed.hint || "";
    } catch {
      reply = raw;
    }

    const meta = inferReplyMeta(String(lastUserMessage), reply, teachingState);

    return NextResponse.json({
      reply,
      status: status || meta.status,
      hint: hint || meta.hint,
      teachingState,
      quota,
      visionUsed: useVision,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err.message || "AI 服务暂时不可用" },
      { status: 500 }
    );
  }
}
