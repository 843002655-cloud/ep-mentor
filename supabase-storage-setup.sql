-- ═══════════════════════════════════════════════════════
-- EP Mentor · Supabase Storage 永久设置
-- 一次性执行，解决所有 RLS 问题
-- ═══════════════════════════════════════════════════════

-- 1. 创建 buckets（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('case-images', 'case-images', true, 52428800, '{image/jpeg,image/png,image/webp,image/gif}'),
  ('case-videos', 'case-videos', true, 209715200, '{video/mp4,video/webm,video/ogg}')
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. 清掉所有旧策略，重建干净的
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 3. 公开读，写入仅通过 Service Role（服务端 API）
CREATE POLICY "public_read_case_assets" ON storage.objects
  FOR SELECT USING (bucket_id IN ('case-images', 'case-videos'));
