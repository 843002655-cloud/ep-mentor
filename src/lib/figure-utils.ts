export interface FigureLike {
  figure_number: string;
  title: string;
  description: string;
  teaching_points: string;
  key_question: string;
  image_url?: string;
}

const GENERIC_QUESTIONS = new Set([
  "你在这张图中观察到了什么？请描述关键特征。",
  "你在这张图中观察到了什么？请描述你看到的特征。",
]);

const GENERIC_TEACHING = new Set([
  "请观察图中的心电图/腔内图特征",
  "请观察图中的心电图/腔内图/CARTO标测特征",
  "请仔细观察这个发现，思考其诊断意义",
]);

/** PDF 批量导入时使用的占位文案 */
export function isGenericFigure(fig: FigureLike): boolean {
  const question = fig.key_question?.trim() || "";
  const teaching = fig.teaching_points?.trim() || "";
  if (!GENERIC_QUESTIONS.has(question)) return false;
  return GENERIC_TEACHING.has(teaching) || /^请观察图/.test(teaching);
}

export function isPlaceholderTitle(title: string): boolean {
  return /^Page \d+$/i.test(title) || /^PDF 页面 \d+$/.test(title) || /^Figure \d+$/i.test(title);
}

export function getLearningStageForFigureIndex(
  stages: Array<Record<string, unknown>>,
  figIdx: number
): Record<string, unknown> | undefined {
  if (stages.length === 0) return undefined;

  const sorted = [...stages].sort(
    (a, b) => Number(a.stage ?? 0) - Number(b.stage ?? 0)
  );

  if (figIdx === 0) {
    const patientStage = sorted.find((s) => {
      const title = String(s.title || "");
      return (
        Number(s.stage) === 0 ||
        title.includes("病史") ||
        title.includes("背景") ||
        title.includes("患者")
      );
    });
    return patientStage ?? sorted[0];
  }

  const imageStageIdx = figIdx - 1;
  const imageStages = sorted.filter((s) => {
    const title = String(s.title || "");
    return !(
      Number(s.stage) === 0 ||
      title.includes("病史") ||
      title.includes("背景")
    );
  });

  return imageStages[imageStageIdx] ?? sorted[imageStageIdx] ?? sorted[figIdx];
}

export function enrichFigureFromStage(
  fig: FigureLike,
  stage: Record<string, unknown> | undefined,
  ecgDetail?: string
): FigureLike {
  const enriched = { ...fig };

  if (stage) {
    if (stage.title && (isGenericFigure(fig) || isPlaceholderTitle(fig.title))) {
      enriched.title = String(stage.title);
    }
    if (stage.description) {
      enriched.description = String(stage.description);
    }
    if (stage.key_concept) {
      enriched.teaching_points = String(stage.key_concept);
    } else if (stage.title && isGenericFigure(fig)) {
      enriched.teaching_points = `本步骤重点：${stage.title}`;
    }
    if (stage.question && (isGenericFigure(fig) || !fig.key_question)) {
      enriched.key_question = String(stage.question);
    }
    if (stage.figure_reference && isPlaceholderTitle(enriched.figure_number)) {
      enriched.figure_number = String(stage.figure_reference);
    }
  }

  if (ecgDetail && !enriched.description) {
    enriched.description = ecgDetail;
  }

  return enriched;
}

export function buildFigureIntroMessage(fig: FigureLike): string {
  const header = `🔽 现在看向：**${fig.figure_number}: ${fig.title}**`;
  const parts = [header];

  if (fig.description) {
    parts.push(`\n\n📖 ${fig.description}`);
  }
  if (fig.teaching_points) {
    parts.push(`\n\n🎯 教学要点：${fig.teaching_points}`);
  }
  parts.push(`\n\n${fig.key_question}`);

  return parts.join("");
}

export function enrichFiguresFromContent(
  figures: FigureLike[],
  content: Record<string, unknown> | undefined
): FigureLike[] {
  if (!content) return figures;

  const stages = (content.learning_stages as Array<Record<string, unknown>>) || [];
  const ecgObj = content.ecg_findings as Record<string, unknown> | undefined;
  const ecgDetails = (ecgObj?.details as string[]) || [];

  return figures.map((fig, idx) => {
    const stage = getLearningStageForFigureIndex(stages, idx);
    const ecgDetail = idx > 0 ? ecgDetails[idx - 1] : undefined;
    return enrichFigureFromStage(fig, stage, ecgDetail);
  });
}
