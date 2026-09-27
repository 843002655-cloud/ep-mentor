-- EP Mentor · 安全加固（在 Supabase SQL Editor 一次性执行）
-- 修复 Storage / usage_logs / analytics_events 的 anon 滥用

-- ── Storage：仅公开读，禁止 anon 写入/删除 ──
DROP POLICY IF EXISTS "service_all_ops" ON storage.objects;
DROP POLICY IF EXISTS "public_read_all" ON storage.objects;

CREATE POLICY "public_read_case_assets" ON storage.objects
  FOR SELECT USING (bucket_id IN ('case-images', 'case-videos'));

-- 上传/删除仅通过服务端 Service Role（绕过 RLS），不再给 anon 写权限

-- ── usage_logs：移除 anon 可写策略 ──
DROP POLICY IF EXISTS "Service can upsert usage" ON usage_logs;

-- ── analytics_events：移除 anon 可写策略 ──
DROP POLICY IF EXISTS "Service can insert analytics" ON analytics_events;
