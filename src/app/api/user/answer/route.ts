import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/user/answer
 * 提交答案并获取 AI 反馈（Mock 数据）
 *
 * Body: { caseId: string, questionId: string, answer: string }
 * Response: { correct: boolean, feedback: string, nextQuestion?: string }
 */

// Mock question bank
const MOCK_ANSWERS: Record<string, { keywords: string[]; feedback: { correct: string; wrong: string } }> = {
  "avnrt-mechanism": {
    keywords: ["房室结双径路", "慢快型", "slow-fast", "AVNRT", "折返"],
    feedback: {
      correct: "完全正确！AVNRT 的机制就是房室结双径路。慢径前传-快径逆传（slow-fast）是最常见的类型，占 80-90%。接下来，我们看看体表心电图上如何找到线索——注意 V1 导联的假性 R' 波。",
      wrong: "你再想想——这个心动过速的电生理机制是什么？观察一下 His 束电极的 A-V 关系和房室传导曲线。",
    },
  },
  "avrt-accessory": {
    keywords: ["旁路", "accessory pathway", "AVRT", "WPW", "Kent束"],
    feedback: {
      correct: "很好，正是旁路参与的 AVRT。向心性传导提示旁路在左侧。你是怎么定位到左侧的？观察 CS 电极的激动顺序——近端最早还是远端最早？",
      wrong: "再仔细看 CS 电极的激动顺序。如果 His 不应期心室刺激能提前心房激动，说明什么？",
    },
  },
  "afl-cti": {
    keywords: ["三尖瓣峡部", "CTI", "心房扑动", "cavotricuspid", "典型房扑"],
    feedback: {
      correct: "正确！典型房扑的折返环依赖三尖瓣-下腔静脉峡部（CTI）。下壁导联负向扑动波（逆钟向折返）是最常见的类型。消融 CTI 线成功率 > 95%。",
      wrong: "下壁导联的扑动波形态给了我们重要线索——负向扑动波提示逆钟向折返，这是 CTI 依赖的典型房扑的特征。",
    },
  },
};

export async function POST(request: NextRequest) {
  const { questionId, answer } = await request.json();

  const q = MOCK_ANSWERS[questionId as string];
  if (!q) {
    // Generic fallback
    return NextResponse.json({
      correct: true,
      feedback: "好的分析。让我们继续下一步。",
      nextQuestion: "基于你的诊断，消融靶点应该选在哪里？",
    });
  }

  const isCorrect = q.keywords.some((kw) =>
    answer.toLowerCase().includes(kw.toLowerCase())
  );

  return NextResponse.json({
    correct: isCorrect,
    feedback: isCorrect ? q.feedback.correct : q.feedback.wrong,
    ...(isCorrect && {
      nextQuestion:
        "很好。现在思考——消融靶点应该选在哪里？为什么？",
    }),
  });
}
