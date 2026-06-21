/** 病例 AI 教学会话状态 — 客户端维护，服务端合并更新 */

export type EpStep = 1 | 2 | 3 | 4 | 5;

export interface TeachingState {
  epStep: EpStep;
  figureIndex: number;
  hintsGiven: number;
  unknownCount: number;
  masteredPoints: string[];
}

export interface ChatReplyMeta {
  status: "questioning" | "hinting" | "confirming";
  hint?: string;
  teachingState?: TeachingState;
}

export const EP_STEP_LABELS: Record<EpStep, string> = {
  1: "基础节律",
  2: "P波/QRS关系",
  3: "心动过速特征",
  4: "鉴别诊断",
  5: "确诊依据",
};

export function createTeachingState(figureIndex = 0): TeachingState {
  return {
    epStep: 1,
    figureIndex,
    hintsGiven: 0,
    unknownCount: 0,
    masteredPoints: [],
  };
}

export function normalizeTeachingState(raw: unknown, figureIndex = 0): TeachingState {
  const base = createTeachingState(figureIndex);
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<TeachingState>;
  const ep = Number(s.epStep);
  return {
    epStep: ep >= 1 && ep <= 5 ? (ep as EpStep) : base.epStep,
    figureIndex: typeof s.figureIndex === "number" ? s.figureIndex : figureIndex,
    hintsGiven: typeof s.hintsGiven === "number" ? s.hintsGiven : 0,
    unknownCount: typeof s.unknownCount === "number" ? s.unknownCount : 0,
    masteredPoints: Array.isArray(s.masteredPoints)
      ? s.masteredPoints.filter((p): p is string => typeof p === "string").slice(0, 20)
      : [],
  };
}

const UNKNOWN_RE = /不知道|不确定|没思路|不清楚|不太懂|想不出/;
const HINT_RE = /提示|hint|给点线索|换个角度|引导一下/i;

export function isHintRequest(message: string): boolean {
  return HINT_RE.test(message.trim());
}

export function isUnknownResponse(message: string): boolean {
  return UNKNOWN_RE.test(message.trim());
}

/** 根据学员输入更新状态（服务端调用） */
export function updateTeachingState(
  state: TeachingState,
  userMessage: string,
  opts?: { figureIndex?: number }
): TeachingState {
  const next = { ...state, masteredPoints: [...state.masteredPoints] };
  if (typeof opts?.figureIndex === "number") {
    next.figureIndex = opts.figureIndex;
  }

  const msg = userMessage.trim();
  if (!msg) return next;

  if (isHintRequest(msg)) {
    next.hintsGiven += 1;
  } else if (isUnknownResponse(msg)) {
    next.unknownCount += 1;
  } else if (msg.length >= 8) {
    next.unknownCount = 0;
    if (next.epStep < 5 && /鉴别|排除|诊断|机制|依据/.test(msg)) {
      next.epStep = Math.min(5, next.epStep + 1) as EpStep;
    }
  }

  return next;
}

export function inferReplyMeta(
  userMessage: string,
  reply: string,
  state: TeachingState
): ChatReplyMeta {
  let status: ChatReplyMeta["status"] = "questioning";
  let hint = "";

  if (
    isHintRequest(userMessage) ||
    state.unknownCount >= 2 ||
    state.hintsGiven > 0 && /注意看|换个角度|提示|关注/.test(reply)
  ) {
    status = "hinting";
    const hintMatch = reply.match(/(?:💡|提示[:：])\s*(.+)/);
    hint = hintMatch?.[1]?.trim() || "";
  }

  if (/完全正确|分析得很完整|很好的观察|理解正确|推理清晰/.test(reply)) {
    status = "confirming";
  }

  return { status, hint, teachingState: state };
}

export const STREAM_META_RE = /\[\[META:([\s\S]*?)\]\]$/;

export function parseStreamMeta(fullText: string): { text: string; meta?: ChatReplyMeta } {
  const match = fullText.match(STREAM_META_RE);
  if (!match) return { text: fullText };
  try {
    const meta = JSON.parse(match[1]) as ChatReplyMeta;
    return { text: fullText.replace(STREAM_META_RE, "").trimEnd(), meta };
  } catch {
    return { text: fullText };
  }
}

export function appendStreamMeta(text: string, meta: ChatReplyMeta): string {
  return `${text}[[META:${JSON.stringify(meta)}]]`;
}
