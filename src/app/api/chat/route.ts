import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources";
import { createServerClient } from "@supabase/ssr";
import { deepseek, DEEPSEEK_MODEL } from "@/lib/deepseek";
import {
  TEACHING_MAX_TOKENS,
  TEACHING_TEMPERATURE,
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

const ANON_LIMIT = 20;

const bailian = process.env.DASHSCOPE_API_KEY
  ? new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    })
  : null;

const VISION_MODEL = process.env.DASHSCOPE_VL_MODEL || "qwen-vl-max";

function resolveImageUrl(url: string, request: NextRequest): string {
  if (/^https?:\/\//i.test(url)) return url;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
}

function visionAvailable(currentFigure?: Record<string, unknown>): boolean {
  return Boolean(bailian && currentFigure?.image_url);
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
  if (userId) return { allowed: true, remaining: 999, total: 999 };

  const supabaseAdmin = getSupabase(cookieHeader, true);
  const today = new Date().toISOString().split("T")[0];
  const limit = ANON_LIMIT;

  const { data: existing } = await supabaseAdmin
    .from("usage_logs")
    .select("chat_count")
    .eq("ip_address", ip)
    .eq("date", today)
    .maybeSingle();

  const current = existing?.chat_count || 0;
  if (current >= limit) {
    return { allowed: false, remaining: 0, total: limit };
  }

  const newCount = current + 1;
  const { error } = await supabaseAdmin.from("usage_logs").upsert(
    { date: today, chat_count: newCount, ip_address: ip },
    { onConflict: "ip_address,date" }
  );
  if (error) console.error("Quota upsert error:", error);

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
  const { useVision, systemPrompt, conversationMessages, currentFigure, request, stream } =
    params;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationMessages,
  ];

  if (useVision && currentFigure?.image_url) {
    messages.push(buildVisionContextMessage(currentFigure, request));
  }

  const client = useVision && bailian ? bailian : deepseek;
  const model = useVision && bailian ? VISION_MODEL : DEEPSEEK_MODEL;

  return client.chat.completions.create({
    model,
    max_tokens: TEACHING_MAX_TOKENS,
    temperature: TEACHING_TEMPERATURE,
    stream,
    ...(stream ? {} : { response_format: { type: "json_object" as const } }),
    messages,
  });
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

    const quota = figureIntro
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
      const systemPrompt = buildFigureIntroPrompt(
        caseContext,
        currentFigure,
        figureIndex,
        figureTotal,
        useVision
      );

      const introMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationMessages.slice(-6),
        { role: "user", content: "请给出这一步的苏格拉底式教学开场。" },
      ];

      if (useVision) {
        introMessages.push(buildVisionContextMessage(currentFigure, request));
      }

      const client = useVision && bailian ? bailian : deepseek;
      const model = useVision && bailian ? VISION_MODEL : DEEPSEEK_MODEL;

      const streamResponse = await client.chat.completions.create({
        model,
        max_tokens: 600,
        temperature: TEACHING_TEMPERATURE,
        stream: true,
        messages: introMessages,
      });

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

    const systemPrompt = useVision
      ? buildVisionTeachingSystemPrompt(caseContext, currentFigure || {}, {
          figureIndex,
          teachingState,
        })
      : buildSystemPrompt(caseContext, currentFigure, {
          figureIndex,
          teachingState,
          visionEnabled: false,
        });

    if (stream) {
      const streamResponse = await createTeachingCompletion({
        useVision,
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
      useVision,
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
