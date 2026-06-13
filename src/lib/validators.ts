// ── Zod Validation Schemas for Admin API Routes ────────────────────────
import { z, ZodError } from "zod";

// ── Cases ────────────────────────────────────────────────────────────────

export const caseSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  category: z.enum(["SVT", "VT", "AF", "AFL"]),
  difficulty: z.enum(["基础", "进阶", "高级"]),
  description: z.string().max(500).optional(),
  ecg_findings: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional(),
  question: z.string().max(500).optional(),
  hint: z.string().max(500).optional(),
  key_points: z.array(z.unknown()).optional(),
  is_published: z.boolean().optional(),
  content_json: z.record(z.string(), z.unknown()).optional(),
}).passthrough(); // allow extra fields from AI generation

export const caseUpdateSchema = caseSchema.partial();

// ── Quiz Questions ────────────────────────────────────────────────────────

export const quizQuestionSchema = z.object({
  question: z.string().min(1, "题目不能为空").max(500),
  options: z.array(z.string()).length(4, "必须提供4个选项"),
  correct_index: z.number().int().min(0).max(3),
  explanation: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  difficulty: z.enum(["基础", "进阶", "高级"]).optional(),
}).passthrough();

export const quizQuestionUpdateSchema = quizQuestionSchema.partial();

// ── Resources ─────────────────────────────────────────────────────────────

export const resourceSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  category: z.string().max(50),
  source: z.string().max(200).optional(),
  summary: z.string().max(1000).optional(),
  url: z.string().url().optional().or(z.literal("")),
}).passthrough();

export const resourceUpdateSchema = resourceSchema.partial();

// ── Submissions ───────────────────────────────────────────────────────────

export const submissionSchema = z.object({
  doctor_name: z.string().max(100).optional(),
  hospital: z.string().max(200).optional(),
  case_title: z.string().min(1, "标题不能为空").max(200),
  case_content: z.string().min(1, "内容不能为空"),
}).passthrough();

export const submissionUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

// ── Validation helper ─────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}
