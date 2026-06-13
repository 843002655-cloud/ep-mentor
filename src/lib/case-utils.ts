/** 将 AI 生成的 case 对象映射为数据库插入所需的字段 */
export function flattenCase(
  c: Record<string, unknown>,
  extra?: Record<string, unknown>
) {
  return {
    title: (c.title as string) || "未命名",
    category: (c.category as string) || "SVT",
    difficulty: (c.difficulty as string) || "基础",
    description: (c.description as string) || "",
    ecg_findings:
      ((c.ecg_findings as Record<string, unknown>)?.details as string[]) ||
      (c.ecg_findings as string[]) ||
      [],
    question: (c.question as string) || "",
    hint: (c.hint as string) || "",
    key_points: (c.key_points as string[]) || [],
    is_published: false,
    mapping_system: (c.mapping_system as string) || "",
    content_json: { ...c, ...extra } as Record<string, unknown>,
  };
}
