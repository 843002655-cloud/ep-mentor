import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 浏览器端 Supabase 客户端（匿名权限，cookie 模式，middleware 兼容） */
export function getSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/** 数据库类型定义 */

export interface Case {
  id: string;
  title: string;
  category: "SVT" | "VT" | "AF" | "AFL";
  difficulty: "基础" | "进阶" | "高级";
  description: string;
  ecg_findings: string[];
  question: string;
  hint: string;
  key_points: string[];
  is_published: boolean;
  mapping_system?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  doctor_name: string;
  hospital: string;
  case_title: string;
  case_content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  case_id: string;
  completed_at: string;
  score: number;
}
