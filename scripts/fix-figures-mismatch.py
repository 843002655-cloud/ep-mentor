"""
修复 figures 与 image_urls 不一致的病例。
病例详情页用 ecg_findings.figures 展示图，但部分病例（Bogun VT 那批）的 figures.image_url
被历史脚本清空了，导致有图却显示不出来。本脚本遍历所有病例，若 figures 与 image_urls
不一致（或为空），则用 image_urls 重建 figures。
"""
import json, sys
from pathlib import Path
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

ENV = {}
env_path = Path(__file__).parent.parent / ".env.local"
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        ENV[k.strip()] = v.strip()

supabase = create_client(ENV["NEXT_PUBLIC_SUPABASE_URL"], ENV["SUPABASE_SERVICE_ROLE_KEY"])

resp = supabase.from_("cases").select("id, title, category, content_json").in_("category", ["SVT", "VT", "AF"]).execute()

fixed = 0
for c in resp.data or []:
    cj = c["content_json"]
    if isinstance(cj, str):
        try:
            cj = json.loads(cj)
        except Exception:
            cj = {}

    urls = cj.get("image_urls") or []
    if not urls:
        continue

    figs = (cj.get("ecg_findings") or {}).get("figures") or []
    fig_urls = [f.get("image_url", "") for f in figs]

    if set(urls) == set(fig_urls):
        continue  # 一致，跳过

    # 重建 figures
    figures_data = []
    for i, url in enumerate(urls):
        figures_data.append({
            "figure_number": f"图 {i+1}",
            "title": f"图 {i+1}",
            "description": "",
            "teaching_points": "请观察图中的心电图/腔内图/CARTO标测特征",
            "key_question": "你在这张图中观察到了什么？请描述关键特征。",
            "image_url": url,
        })
    ecg = cj.get("ecg_findings") or {}
    if isinstance(ecg, dict):
        ecg["figures"] = figures_data
        cj["ecg_findings"] = ecg
    elif isinstance(ecg, list):
        cj["ecg_findings"] = {"details": ecg, "figures": figures_data}

    supabase.from_("cases").update({"content_json": cj}).eq("id", c["id"]).execute()
    fixed += 1
    print(f"  修复: [{c['category']}] {c['title'][:45]}")

print(f"\n修复了 {fixed} 个病例的 figures")
