-- EP Mentor - Supabase 数据库初始化 SQL
-- 请在 Supabase SQL Editor 中执行此文件

-- 1. 病例表
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('SVT', 'VT', 'AF', 'AFL')),
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
  '典型心房扑动的诊断与消融',
  'AFL',
  '进阶',
  '68岁男性，因反复发作性心悸2个月入院。心悸呈持续性，心率约150次/分，Valsalva动作不能终止。既往有高血压病史。心电图示锯齿状扑动波，下壁导联明显。',
  ARRAY['心房率300 bpm，心室率150 bpm', '下壁导联可见锯齿状扑动波（F波）', '窄QRS波（QRS < 120ms）', '2:1房室传导比例'],
  '如何根据体表心电图定位心房扑动的折返路径？典型与不典型房扑的鉴别要点是什么？',
  '看看下壁导联F波的方向——负向F波提示逆钟向折返（典型AFL），正向F波提示顺钟向折返。CTI依赖性是诊断的关键。',
  ARRAY['典型AFL折返环', 'CTI峡部消融', '扑动波形态分析', '2:1传导识别'],
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
  category TEXT NOT NULL DEFAULT '综合' CHECK (category IN ('SVT', 'VT', 'AF', 'AFL', '综合')),
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
  'AVNRT 的折返环位于房室结区域，最常见的类型是慢-快型（slow-fast），占 80-90%。delta 波是预激综合征（AFL）的特征。',
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
  '典型心房扑动（AFL）的折返环位于？',
  ARRAY['左心房后壁', '肺静脉口', '三尖瓣-下腔静脉峡部', '冠状窦口'],
  2,
  '典型 AFL 折返环位于右心房三尖瓣-下腔静脉峡部（CTI），导管消融线性消融 CTI 成功率 > 95%。',
  'AFL'
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

-- 种子数据（续）
INSERT INTO quiz_questions (question, options, correct, explanation, category) VALUES
(
  '关于预激综合征（WPW 综合征），以下哪项描述是正确的？',
  ARRAY['Delta 波由房室结加速传导引起', '旁路前传在心电图上表现为 delta 波和短 PR 间期', '所有 WPW 患者都需要导管消融', '腺苷是 WPW 合并房颤时的首选药物'],
  1,
  '旁路（accessory pathway）前向传导产生 delta 波，使 PR 间期缩短、QRS 增宽。无症状 WPW 需电生理评估危险分层，WPW 合并房颤禁用腺苷（可能诱发室颤）。',
  'SVT'
),
(
  'AVNRT 与 AVRT 的鉴别中，以下哪项最有诊断价值？',
  ARRAY['心率快慢', 'QRS 波宽度', 'RP 间期长短', '是否有房室分离'],
  2,
  'RP 间期是最关键的鉴别点：短 RP 心动过速（RP < 70ms）多见于典型 AVNRT（慢-快型），长 RP 心动过速（RP > 70ms）需考虑 AVRT（顺向型）或非典型 AVNRT。',
  'SVT'
),
(
  '关于 Mahaim 纤维介导的心动过速，以下哪项正确？',
  ARRAY['心电图表现为 LBBB 形态的宽 QRS 心动过速', '通常为逆向型 AVRT', 'Mahaim 纤维只有逆传功能', '最常见于左室游离壁'],
  0,
  'Mahaim 纤维是一种特殊的右侧旁路，只有前向递减传导功能（无逆传），介导的心动过速呈 LBBB 形态。靶点在三尖瓣环的 Mahaim 电位。',
  'SVT'
),
(
  '以下哪项不是典型心房扑动的特征？',
  ARRAY['下壁导联负向锯齿波（F 波）', '心房率约 300 bpm', '折返环依赖 CTI', 'P 波形态多变，至少有 3 种形态'],
  3,
  'P 波形态多变（≥3 种形态）是房性心动过速的特征，不是典型 AFL。典型 AFL 的 F 波形态规则，下壁导联呈锯齿状，心房率 250-350 bpm。',
  'AFL'
),
(
  '关于 ARVC（致心律失常性右室心肌病）相关 VT，以下哪项描述错误？',
  ARRAY['心电图 epsilon 波是特征性表现', 'VT 通常呈 LBBB 形态', '影像学可见右室脂肪浸润', '早期阶段左室功能通常严重受损'],
  3,
  'ARVC 早期主要表现为右室受累，左室功能通常保留。epsilon 波、LBBB 形态 VT、右室脂肪浸润均为 ARVC 的典型特征。2010 Task Force 诊断标准需要 ≥2 项主要标准。',
  'VT'
),
(
  '关于流出道 VT 的标测和消融，以下哪项正确？',
  ARRAY['通常需要心外膜途径', '最早激动点比 QRS 起始提前 30ms 以上', '起搏标测要求 12 导联完全匹配', '冷盐水灌注导管是必须的'],
  1,
  '流出道 VT 消融成功的关键是在最早激动点消融，局部电位应比体表 QRS 起始提前 30ms 以上。起搏标测 12/12 匹配为理想目标但不是绝对必须。',
  'VT'
),
(
  '房颤导管消融术后 3 个月内发生房性心律失常，应如何管理？',
  ARRAY['立即进行二次消融', '视为空白期（blanking period），药物控制 + 观察', '永久性起搏器植入', '立即电复律'],
  1,
  '术后 3 个月为空白期（blanking period），此期间房性心律失常不代表消融失败，可能与消融灶炎症/水肿相关。推荐药物治疗控制症状，3 个月后再评估消融效果。',
  'AF'
),
(
  '以下哪种情况下，左心耳封堵术相对于长期抗凝最具优势？',
  ARRAY['年轻、无合并症的阵发性房颤', '高卒中风险且长期抗凝有禁忌（如反复大出血）', '房颤合并重度二尖瓣狭窄', '孤立性房扑'],
  1,
  '左心耳封堵（如 Watchman 装置）适用于高卒中风险（CHA₂DS₂-VASc ≥2）但长期抗凝有禁忌的患者。不适用于需要抗凝的其他适应证或合并瓣膜性心脏病。',
  'AF'
),
(
  '关于电生理检查中拖带（entrainment）标测，以下哪项描述是正确的？',
  ARRAY['拖带只能在窦性心律下完成', '隐匿性融合（concealed fusion）提示起搏部位在折返环内', 'PPI-TCL > 30ms 提示起搏部位在折返环内', '拖带不能用于房扑标测'],
  1,
  '隐匿性融合是判断起搏部位在折返环内的关键指标——起搏不改变心动过速的激动顺序和 P/QRS 形态。PPI-TCL < 30ms 提示起搏部位在折返环内。',
  '综合'
),
(
  '关于心外膜室速，以下哪项心电图特征最有提示意义？',
  ARRAY['QRS 波时限 < 120ms', '胸前导联 QRS 起始有假性 delta 波 > 34ms', '心电轴正常', 'V1 导联呈 rS 形态'],
  1,
  '心外膜 VT 的心电图特征包括：假性 delta 波 > 34ms、V2 导联类本位曲折时间延长、MDI > 0.55。心外膜途径消融需注意冠脉和膈神经。',
  'VT'
),
(
  '以下哪种抗心律失常药物在房颤合并结构性心脏病（LVEF < 40%）中是安全的？',
  ARRAY['氟卡尼', '普罗帕酮', '胺碘酮', '索他洛尔'],
  2,
  'CAST 试验证实 I 类抗心律失常药物（氟卡尼、普罗帕酮）增加心梗后患者的死亡率。胺碘酮在结构性心脏病中相对安全，不显著增加死亡率。索他洛尔也需谨慎使用。',
  'AF'
),
(
  '关于室上性心动过速的急性处理，以下哪项是维拉帕米的禁忌证？',
  ARRAY['窄 QRS 波心动过速', '宽 QRS 波心动过速，机制不明确', 'AVNRT', '房性心动过速'],
  1,
  '宽 QRS 波心动过速在未明确机制前，禁忌使用维拉帕米。如果是 VT，维拉帕米可能导致严重低血压和血流动力学崩溃。宽 QRS 波心动过速在未证明是 SVT 合并差传前，按 VT 处理。',
  'SVT'
),
(
  '关于心内超声（ICE）在导管消融中的应用，以下哪项不是其主要优势？',
  ARRAY['实时监测心包积液', '辅助房间隔穿刺', '替代三维电解剖标测系统', '评估导管-组织贴靠'],
  2,
  'ICE 不能替代三维标测系统（如 Carto、EnSite），两者是互补工具。ICE 主要用于房间隔穿刺引导、心包监测、组织贴靠评估和肺静脉解剖观察。',
  '综合'
),
(
  '关于希氏束旁旁路，以下哪项描述正确？',
  ARRAY['消融风险极低', '消融前需确认 His 电位位置并密切监测交界心律', '通常采用心外膜消融', '希氏束旁旁路无法消融，只能药物治疗'],
  1,
  '希氏束旁旁路消融有房室传导损伤风险。消融策略：在窦性心律下确认 His 电位位置，低能量起始，密切监测 PR 间期和交界心律，出现快交界心律或 PR 延长立即停止。',
  'SVT'
),
(
  '关于房颤的节律控制 vs 心率控制，以下哪项描述符合最新指南推荐？',
  ARRAY['所有房颤患者都应优先选择心率控制', '症状明显或有心衰的患者，节律控制（包括消融）优于单纯心率控制', '导管消融只能用于 65 岁以下患者', '心率控制目标为静息心率 < 60 bpm'],
  1,
  'EAST-AFNET 4 试验（2020）证实早期节律控制改善预后。2024 ESC 指南推荐症状性房颤或合并心衰者积极节律控制（I 类推荐）。心率控制目标为静息心率 < 110 bpm（宽松策略）。',
  'AF'
),
(
  '关于流出道室早（PVC）消融，以下哪项提示消融靶点正确？',
  ARRAY['起搏标测 8/12 导联匹配', '局部电位比 QRS 起始提前 20ms', '单极电图呈 QS 形态 + 双极电图碎裂电位', '放电后室早即刻增多'],
  2,
  '理想靶点特征：单极电图 QS 形态（激动从该点向外传导）+ 双极电图最早激动点（提前 > 30ms）+ 起搏标测 12/12 最佳匹配。放电后室早增多（一过性）往往提示靶点正确。',
  'VT'
),
(
  '关于典型房扑 CTI 消融的终点，以下哪项是最严格的标准？',
  ARRAY['消融过程中房扑终止', '冠状窦起搏时 CS1-2 到 CS9-10 的激动时间为 100ms', 'CTI 双向阻滞（bidirectional block）', '消融线两侧电压 < 0.1mV'],
  2,
  'CTI 双向阻滞是典型房扑消融的标准终点——起搏 CS 近端时低位右房侧壁激动由下向上（逆钟向阻滞），起搏低位右房侧壁时 CS 激动由近到远（顺钟向阻滞）。仅房扑终止不足以确认消融成功。',
  'AFL'
),
(
  '关于孕妇合并 SVT 的急性处理，以下哪项是禁忌？',
  ARRAY['迷走神经刺激（Valsalva 动作）', '腺苷静脉推注', '维拉帕米静脉推注', '同步直流电复律'],
  2,
  '妊娠期 SVT：首选 Valsalva 动作和腺苷（均安全）。维拉帕米和地尔硫卓在妊娠期应避免（可能导致胎儿心动过缓和低血压）。必要时电复律是安全的。',
  'SVT'
),
(
  '关于心外膜消融的入路，以下哪项描述错误？',
  ARRAY['经皮剑突下穿刺是最常用入路', '需注意右室和冠脉的解剖位置', '心外膜途径不能与心内膜途径联合使用', '术后需监测心包积液'],
  2,
  '心外膜和心内膜途径可以并经常联合使用——"三明治"消融策略对于某些心肌病相关 VT 更有效。经皮剑突下穿刺（Sosa 技术）是标准心外膜入路。',
  'VT'
),
(
  '关于房颤抗凝，以下哪项 CHA₂DS₂-VASc 评分组合推荐启动抗凝？',
  ARRAY['评分为 0（无危险因素）', '男性评分 ≥1 或女性评分 ≥2', '仅高血压一项', '所有房颤患者都应抗凝'],
  1,
  '2024 ESC 指南：男性 CHA₂DS₂-VASc ≥2、女性 ≥3 推荐抗凝（I 类）；男性 =1、女性 =2 应考虑抗凝（IIa 类）；男性 =0、女性 =1 不建议抗凝。',
  'AF'
);
-- ============================================================
-- 9. 每日对话配额表
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  date DATE DEFAULT CURRENT_DATE,
  chat_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 匿名用户（未登录）按 IP 去重
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_logs_ip_date ON usage_logs(ip_address, date) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_logs_ip ON usage_logs(ip_address, date);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own usage" ON usage_logs;
CREATE POLICY "Users can read own usage" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin can read all usage" ON usage_logs;
CREATE POLICY "Admin can read all usage" ON usage_logs
  FOR SELECT USING (auth.email() = current_setting('app.settings.admin_email', true));
DROP POLICY IF EXISTS "Service can upsert usage" ON usage_logs;
CREATE POLICY "Service can upsert usage" ON usage_logs
  FOR ALL USING (true) WITH CHECK (true);
