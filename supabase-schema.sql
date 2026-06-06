-- EP Mentor - Supabase 数据库初始化 SQL
-- 请在 Supabase SQL Editor 中执行此文件

-- 1. 病例表
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('SVT', 'VT', 'AF', 'WPW')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('基础', '进阶', '高级')),
  description TEXT NOT NULL DEFAULT '',
  ecg_findings TEXT[] DEFAULT '{}',
  question TEXT NOT NULL DEFAULT '',
  hint TEXT NOT NULL DEFAULT '',
  key_points TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 医生投稿表
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_name TEXT NOT NULL,
  hospital TEXT NOT NULL DEFAULT '',
  case_title TEXT NOT NULL,
  case_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 用户学习进度表
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score INT NOT NULL DEFAULT 0
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_difficulty ON cases(difficulty);
CREATE INDEX IF NOT EXISTS idx_cases_published ON cases(is_published);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_date ON user_progress(completed_at);

-- 5. RLS 策略
-- cases: 公开读取已发布病例
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read published cases" ON cases;
CREATE POLICY "Anyone can read published cases" ON cases
  FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Admin can do all on cases" ON cases;
CREATE POLICY "Admin can do all on cases" ON cases
  USING (auth.email() = current_setting('app.settings.admin_email', true));

-- submissions: 登录用户可创建，管理员可查看和管理
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can create submissions" ON submissions;
CREATE POLICY "Authenticated users can create submissions" ON submissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin can read all submissions" ON submissions;
CREATE POLICY "Admin can read all submissions" ON submissions
  FOR SELECT USING (auth.email() = current_setting('app.settings.admin_email', true));
DROP POLICY IF EXISTS "Admin can update submissions" ON submissions;
CREATE POLICY "Admin can update submissions" ON submissions
  FOR UPDATE USING (auth.email() = current_setting('app.settings.admin_email', true));

-- user_progress: 用户可查看自己的进度
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
CREATE POLICY "Users can read own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can read all progress" ON user_progress;
CREATE POLICY "Admin can read all progress" ON user_progress
  FOR SELECT USING (auth.email() = current_setting('app.settings.admin_email', true));

-- 6. 种子数据（可选）
INSERT INTO cases (title, category, difficulty, description, ecg_findings, question, hint, key_points, is_published) VALUES
(
  '窄QRS波心动过速鉴别',
  'SVT',
  '基础',
  '32岁女性，因反复发作性心悸2年入院。心悸突发突止，每次持续约20-30分钟，可自行终止。体格检查未见异常。心电图示窄QRS波心动过速，心率180次/分。',
  ARRAY['窄QRS波（QRS < 120ms）', '心率180 bpm，规整', '未见明显P波', 'ST-T改变可能为频率相关性'],
  '如何根据体表心电图鉴别AVNRT和AVRT？有无隐匿性旁路的线索？',
  '注意观察假性R''波（pseudo R''）在V1导联的出现，这是AVNRT的重要线索。',
  ARRAY['AVNRT慢快型', 'AVRT顺向型', '假性R''波', 'Coumel定律'],
  true
),
(
  '宽QRS波心动过速的鉴别诊断',
  'VT',
  '进阶',
  '65岁男性，有陈旧性前壁心肌梗死病史。本次因持续性心悸伴轻度头晕3小时来诊。血压100/65 mmHg，心电图示宽QRS波心动过速，心室率200次/分。',
  ARRAY['宽QRS波 > 140ms', '房室分离现象', '心电轴极度右偏', '胸前导联QRS波一致性正向'],
  '宽QRS波心动过速的鉴别诊断流程是什么？哪些心电图特征支持室速的诊断？',
  '房室分离和融合波是诊断VT的特异性指标。Brugada四步法可帮助系统分析。',
  ARRAY['Brugada标准', '房室分离', '室性融合波', '胸前导联一致性'],
  true
),
(
  '房颤患者卒中预防策略',
  'AF',
  '基础',
  '72岁女性，持续性房颤病史5年，合并高血压、糖尿病。目前服用华法林抗凝，INR波动较大，TTR仅55%。患者希望了解导管消融的可行性和新型口服抗凝药的选择。',
  ARRAY['房颤心律，心室率约90 bpm', '无明显缺血性ST-T改变', '左房内径增大（45mm）'],
  '根据CHA2DS2-VASc评分，该患者卒中风险如何？导管消融 vs 药物治疗，应如何与患者沟通？',
  '计算CHA2DS2-VASc评分，每个危险因素1-2分。TTR < 65% 提示华法林管理不佳，可考虑NOAC。',
  ARRAY['CHA2DS2-VASc评分', 'NOAC药物选择', '导管消融适应证', '左房内径评估'],
  true
),
(
  '无症状预激综合征的处理',
  'WPW',
  '进阶',
  '25岁男性，飞行员体检发现心电图异常。心电图示PR间期缩短、QRS波起始部可见delta波，符合预激综合征改变。患者否认任何心悸、晕厥史，平素运动耐量良好。',
  ARRAY['PR间期 100ms', 'QRS 130ms 可见delta波', 'V1导联delta波正向（左侧旁路）'],
  '无症状WPW患者是否需要电生理检查和导管消融？职业（飞行员）如何影响决策？',
  'ACC/HRS指南对无症状WPW的处理有明确分层。高危职业（飞行员、驾驶员）的处理策略与普通人群不同。',
  ARRAY['无症状WPW危险分层', 'EPS适应证', '高危职业处理', 'ACC/HRS指南2023'],
  true
);

-- ============================================================
-- 7. 资料库表（学习资料 / 文献 / 指南）
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('指南', '文献', '视频', '工具', '其他')),
  source TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
CREATE POLICY "Anyone can read resources" ON resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can do all on resources" ON resources;
CREATE POLICY "Admin can do all on resources" ON resources
  USING (auth.email() = current_setting('app.settings.admin_email', true));

-- 种子数据：经典指南
INSERT INTO resources (title, category, source, url, summary) VALUES
(
  '2024 ESC Guidelines for the management of atrial fibrillation',
  '指南',
  'European Heart Journal',
  'https://academic.oup.com/eurheartj/article/45/36/3314/7738775',
  '2024 ESC 房颤管理指南，涵盖抗凝、心率/节律控制和导管消融的最新推荐。'
),
(
  '2023 ACC/AHA/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation',
  '指南',
  'JACC',
  'https://www.jacc.org/doi/10.1016/j.jacc.2023.08.017',
  '美国房颤诊疗综合指南，I 类推荐肺静脉隔离用于药物治疗无效的阵发性房颤。'
),
(
  '2019 ESC Guidelines on Supraventricular Tachycardia',
  '指南',
  'European Heart Journal',
  'https://academic.oup.com/eurheartj/article/41/5/655/5556821',
  'ESC 室上性心动过速管理指南，涵盖 AVNRT、AVRT、AT 的诊断与治疗。'
),
(
  '2022 ESC Guidelines for the management of patients with ventricular arrhythmias',
  '指南',
  'European Heart Journal',
  'https://academic.oup.com/eurheartj/article/43/40/3997/6675764',
  'ESC 室性心律失常管理和心源性猝死预防指南。'
),
(
  'HRS/EHRA/APHRS Expert Consensus on Catheter Ablation of Ventricular Arrhythmias',
  '指南',
  'Heart Rhythm',
  'https://www.heartrhythmjournal.com/article/S1547-5271(19)30632-0/',
  '三大心律学会室性心律失常导管消融专家共识，涵盖标测与消融技术。'
);

-- ============================================================
-- 8. 知识测验题库表
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL DEFAULT '{}',
  correct INT NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '综合' CHECK (category IN ('SVT', 'VT', 'AF', 'WPW', '综合')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read quiz_questions" ON quiz_questions;
CREATE POLICY "Anyone can read quiz_questions" ON quiz_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can do all on quiz_questions" ON quiz_questions;
CREATE POLICY "Admin can do all on quiz_questions" ON quiz_questions
  USING (auth.email() = current_setting('app.settings.admin_email', true));

-- 种子数据
INSERT INTO quiz_questions (question, options, correct, explanation, category) VALUES
(
  '关于 AVNRT（房室结折返性心动过速），以下哪项描述是正确的？',
  ARRAY['通常由房室旁路引起', '折返环位于房室结区域，慢-快型最常见', '心电图可见明显的 delta 波', '首选治疗是腺苷静脉推注，其他方法均无效'],
  1,
  'AVNRT 的折返环位于房室结区域，最常见的类型是慢-快型（slow-fast），占 80-90%。delta 波是预激综合征（WPW）的特征。',
  'SVT'
),
(
  '房颤（AF）患者进行导管消融的主要靶点是？',
  ARRAY['房室结', '希氏束', '肺静脉', '冠状窦'],
  2,
  '肺静脉是房颤触发灶最常见的来源，肺静脉隔离（PVI）是房颤导管消融的基石。',
  'AF'
),
(
  '关于 WPW 综合征的心电图特征，以下哪项是正确的？',
  ARRAY['PR 间期延长 > 200ms', 'QRS 波群增宽，起始部可见 delta 波', 'QRS 波群变窄 < 80ms', 'QT 间期显著缩短'],
  1,
  'WPW 综合征典型心电图：PR 间期缩短（<120ms）、QRS 增宽（>120ms）、起始部 delta 波。',
  'WPW'
),
(
  '以下哪项是特发性室速最常见的类型？',
  ARRAY['致心律失常性右室心肌病相关 VT', '缺血性心肌病相关 VT', '右室流出道 VT（RVOT-VT）', '束支折返性 VT'],
  2,
  'RVOT-VT 是特发性 VT 最常见类型，约占 60-80%，通常为腺苷敏感性。心电图呈 LBBB 形态伴下壁导联高大 R 波。',
  'VT'
),
(
  '心脏电生理检查中，His 束电位的正常 HV 间期为？',
  ARRAY['10-20 ms', '35-55 ms', '80-120 ms', '150-200 ms'],
  1,
  'HV 间期正常范围 35-55 ms，代表从 His 束到心室肌的传导时间。HV > 100 ms 提示希浦系统病变。',
  'SVT'
),
(
  '典型心房扑动（AFL）的折返环位于？',
  ARRAY['左心房后壁', '肺静脉口', '三尖瓣-下腔静脉峡部', '冠状窦口'],
  2,
  '典型 AFL 的折返环位于右心房三尖瓣-下腔静脉峡部（cavotricuspid isthmus, CTI），导管消融 CTI 线成功率 > 95%。',
  'SVT'
),
(
  '关于 Brugada 综合征，以下哪项是正确的？',
  ARRAY['心电图呈 LBBB 形态', '右胸导联 ST 段抬高，与 SCN5A 基因突变相关', '通常由缺血性心肌病引起', '首选治疗是 β 受体阻滞剂'],
  1,
  'Brugada 综合征的特征是右胸导联（V1-V3）ST 段抬高，最常见与 SCN5A 基因突变相关。ICD 是高危患者的一线治疗。',
  '综合'
);
