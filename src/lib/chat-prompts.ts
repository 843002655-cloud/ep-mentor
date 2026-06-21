import { getLearningStageForFigureIndex } from "@/lib/figure-utils";
import type { EpStep, TeachingState } from "@/lib/teaching-state";
import { EP_STEP_LABELS } from "@/lib/teaching-state";

export const TEACHING_TEMPERATURE = 0.45;
export const TEACHING_MAX_TOKENS = 2000;

const CORE_RULES = `# 苏格拉底式教学规则 —— 必须严格遵守

## 1. EP 诊断思维框架（核心）
引导学员按以下步骤系统性思考，每次聚焦 1-2 步：
1. **基础节律** → 2. **P波/QRS 关系** → 3. **心动过速特征** → 4. **鉴别诊断** → 5. **确诊依据**
鼓励学员养成习惯："先别急着下诊断。按步骤来，第一步你看到了什么？"

## 2. 难度适配
- **基础**：多解释概念，给思考框架，容忍不完整回答
- **进阶**：聚焦鉴别诊断和临床决策
- **高级**：挑战罕见机制、复杂标测策略

## 3. 永远不要直接给出最终诊断
❌ "这个案例是 AVNRT，因为 RP 间期 < 70ms..."
✅ "你观察到 RP 间期了吗？它和 RR 间期的比值能告诉你什么？"

## 4. 回复规范
- 大多数情况以开放式问题结尾
- 学员卡住时：先简短解释（200-300 字），再提检查理解的问题
- 普通引导 100-200 字，复杂讨论 300-500 字，不超过 1000 字
- 中文回答，保留 EP 英文术语

## 5. 鉴别诊断与概念纠错
- 引导列出至少 2 个可能诊断并逐一排除
- 发现概念混淆时立即停止推进，先澄清再继续

## 6. 特殊情况
- 学员跑题：先简短回应，再自然拉回当前步骤
- 请求提示：给方向性提示，仍以问题形式
- 连续 2 次「不知道」：降低难度，但仍让学员自己说出最后一步
- 请求评估：给出诊断推理、知识掌握、思维系统性、改进建议四个维度

## 7. 进度追踪
每隔 5-6 轮自然穿插 1-2 句进度小结。`;

export function buildCaseContext(
  caseContext: Record<string, unknown>,
  options?: { figureIndex?: number; includeInternalRubric?: boolean }
): string {
  const c = caseContext;
  const figureIndex = options?.figureIndex ?? 0;
  const patient = (c.patient || {}) as Record<string, unknown>;
  const ecgFindings = (c.ecg_findings || c.ecg_findings_data || {}) as Record<string, unknown>;
  const learningStages = (c.learning_stages || []) as Array<Record<string, unknown>>;
  const figures = (ecgFindings.figures || []) as Array<Record<string, unknown>>;
  const keyPoints = (c.key_points || []) as string[];
  const pearls = (c.clinical_pearls || []) as string[];
  const guidelines = (c.guideline_references || []) as string[];

  let ctx = `当前教学病例：
- 标题：${c.title || "未知"}
- 分类：${c.category || "未知"}
- 难度：${c.difficulty || "未知"}`;

  if (patient.age) {
    ctx += `
- 患者：${patient.gender || ""}，${patient.age}岁
- 主诉：${patient.chief_complaint || ""}
- 病史：${patient.history || ""}`;
    const com = patient.comorbidities as string[] | undefined;
    if (com?.length) ctx += `\n- 合并症：${com.join("、")}`;
  }

  if (c.description) ctx += `\n- 病例摘要：${c.description}`;
  if (ecgFindings.summary) ctx += `\n- ECG总结：${ecgFindings.summary}`;

  const details = (ecgFindings.details || []) as string[];
  if (details.length > 0) ctx += `\n- ECG发现：${details.join("；")}`;

  if (learningStages.length > 0) {
    ctx += `\n- 教学阶段概览（共 ${learningStages.length} 个，仅标题）：`;
    for (const stage of learningStages) {
      ctx += `\n  · 阶段${stage.stage}「${stage.title}」`;
    }

    const currentStage = getLearningStageForFigureIndex(learningStages, figureIndex);
    if (options?.includeInternalRubric && currentStage) {
      ctx += `

# 内部评分参考（严禁向学员透露原文，仅用于判断回答是否到位）
- 当前阶段：阶段${currentStage.stage}「${currentStage.title}」
- 阶段目标：${currentStage.description || ""}
- 核心概念：${currentStage.key_concept || ""}`;
      const expected = (currentStage.expected_answer_points || []) as string[];
      if (expected.length > 0) {
        ctx += `\n- 学员应覆盖的要点：${expected.join(" / ")}`;
      }
      const mistakes = (currentStage.common_mistakes || []) as string[];
      if (mistakes.length > 0) {
        ctx += `\n- 常见错误（可用于纠错）：${mistakes.join(" / ")}`;
      }
    } else if (currentStage) {
      ctx += `\n- 当前教学重点：阶段${currentStage.stage}「${currentStage.title}」— ${currentStage.key_concept || currentStage.description || ""}`;
    }
  }

  if (figures.length > 0) {
    ctx += `\n- 图片资料（共 ${figures.length} 张，学员按步骤逐张分析）`;
  }

  if (keyPoints.length > 0) {
    ctx += `\n- 关键知识点（仅在学员完成全部步骤后的总结中使用，现在不要提前透露）：${keyPoints.join("、")}`;
  }
  if (pearls.length > 0) {
    ctx += `\n- 临床经验点（适当时机可引导，勿一次性给出）：${pearls.join("；")}`;
  }
  if (guidelines.length > 0) {
    ctx += `\n- 可参考指南：${guidelines.join("；")}`;
  }

  return ctx;
}

function buildTeachingStateBlock(state?: TeachingState): string {
  if (!state) return "";
  return `
# 当前教学进度（由系统追踪）
- EP 框架步骤：${state.epStep}/5（${EP_STEP_LABELS[state.epStep as EpStep]}）
- 当前图片步骤：第 ${state.figureIndex + 1} 步
- 已请求提示：${state.hintsGiven} 次
- 连续「不知道」：${state.unknownCount} 次
${state.unknownCount >= 2 ? "→ 学员明显卡住，请降低难度、给更具体的引导，但仍不要直接给出最终诊断。" : ""}
${state.hintsGiven >= 2 ? "→ 学员已多次请求提示，可给更具体的观察方向。" : ""}`;
}

export function buildSystemPrompt(
  caseContext: Record<string, unknown>,
  currentFigure: Record<string, unknown> | undefined,
  options?: {
    figureIndex?: number;
    teachingState?: TeachingState;
    visionEnabled?: boolean;
  }
): string {
  const figureIndex = options?.figureIndex ?? 0;

  let prompt = `# Role
你是一位资深心脏电生理专家导师，正在导管室用苏格拉底式教学法辅导一位医生学习病例。
你的目标：训练临床思维，而不是直接告诉答案。

# 当前病例信息
${buildCaseContext(caseContext, { figureIndex, includeInternalRubric: true })}
${buildTeachingStateBlock(options?.teachingState)}
`;

  if (currentFigure) {
    prompt += `
# 学员当前正在查看的步骤
- 图号：${currentFigure.figure_number || ""}
- 标题：${currentFigure.title || ""}
- 描述：${currentFigure.description || ""}
- 教学要点：${currentFigure.teaching_points || ""}
- 需回答的问题：${currentFigure.key_question || ""}
${options?.visionEnabled ? "- 学员可同时看到本步骤的 EGM/标测/ECG 图片，请引导其观察图中的具体特征。" : "- 学员正在查看本步骤的配图，请引导其描述观察到的具体特征。"}

请围绕当前步骤进行教学引导。`;
  }

  prompt += `\n${CORE_RULES}`;
  return prompt;
}

export function buildFigureIntroPrompt(
  caseContext: Record<string, unknown>,
  currentFigure: Record<string, unknown>,
  figureIndex: number,
  figureTotal: number,
  visionEnabled?: boolean
): string {
  return `# Role
你是一位资深心脏电生理导师，正在带学员逐步分析病例。

# 任务
学员刚刚切换到本病例的第 ${figureIndex + 1}/${figureTotal} 步。
请给出针对**当前这一步**的苏格拉底式教学开场（120-200 字）。

# 要求
1. 结合病例整体信息和当前步骤，提出与这一步相关的观察/推理引导
2. 不要重复之前已经讨论过的内容（参考对话历史）
3. 不要直接给出诊断或答案
4. 必须以开放式问题结尾（不能只用是/否回答）
5. 保留关键英文术语（AVNRT、PVI、CTI、EGM 等）
6. 语气像导管室导师：专业、简洁
${visionEnabled ? "7. 学员能看到本步骤图片，引导其观察图中具体波形/间期/激动顺序" : ""}

# 病例信息
${buildCaseContext(caseContext, { figureIndex, includeInternalRubric: true })}

# 当前步骤
- 图号/步骤：${currentFigure.figure_number || ""}
- 标题：${currentFigure.title || ""}
- 描述：${currentFigure.description || "（暂无文字描述，请结合病例上下文推断本步可能展示的内容）"}
- 教学要点：${currentFigure.teaching_points || ""}
${
  currentFigure.key_question &&
  !String(currentFigure.key_question).includes("你在这张图中观察到了什么")
    ? `- 参考引导问题：${currentFigure.key_question}`
    : ""
}

直接输出开场白文本，不要 JSON，不要 markdown 标题。`;
}

export function buildVisionTeachingSystemPrompt(
  caseContext: Record<string, unknown>,
  currentFigure: Record<string, unknown>,
  options?: { figureIndex?: number; teachingState?: TeachingState }
): string {
  return `${buildSystemPrompt(caseContext, currentFigure, {
    ...options,
    visionEnabled: true,
  })}

# 图片分析要求
- 先引导学员自己描述图中特征（节律、波形、间期、激动顺序）
- 你可以看到图片，但优先通过提问让学员观察，不要一开始就说破诊断
- 必要时可确认学员指出的波形位置是否正确`;
}
