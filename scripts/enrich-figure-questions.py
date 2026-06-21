"""
Batch-enrich case figure metadata from learning_stages + DeepSeek AI.

Usage:
  python scripts/enrich-figure-questions.py --dry-run     # preview only
  python scripts/enrich-figure-questions.py               # update all cases
  python scripts/enrich-figure-questions.py --limit 5     # test on 5 cases
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

import requests
from openai import OpenAI
from supabase import create_client

sys.stdout.reconfigure(encoding="utf-8")

GENERIC_QUESTIONS = {
    "你在这张图中观察到了什么？请描述关键特征。",
    "你在这张图中观察到了什么？请描述你看到的特征。",
}
GENERIC_TEACHING = {
    "请观察图中的心电图/腔内图特征",
    "请观察图中的心电图/腔内图/CARTO标测特征",
    "请仔细观察这个发现，思考其诊断意义",
}


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    path = Path(__file__).parent.parent / ".env.local"
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def is_generic_figure(fig: dict[str, Any]) -> bool:
    q = (fig.get("key_question") or "").strip()
    t = (fig.get("teaching_points") or "").strip()
    if q not in GENERIC_QUESTIONS:
        return False
    return t in GENERIC_TEACHING or t.startswith("请观察图")


def is_placeholder_title(title: str) -> bool:
    return bool(
        re.match(r"^Page \d+$", title or "", re.I)
        or re.match(r"^PDF 页面 \d+$", title or "")
        or re.match(r"^Figure \d+$", title or "", re.I)
    )


def get_stage_for_figure(stages: list[dict], fig_idx: int) -> dict | None:
    if not stages:
        return None
    sorted_stages = sorted(stages, key=lambda s: int(s.get("stage") or 0))
    if fig_idx < len(sorted_stages):
        return sorted_stages[fig_idx]
    return None


def enrich_figure_from_stage(
    fig: dict[str, Any],
    stage: dict | None,
    ecg_detail: str | None = None,
) -> dict[str, Any]:
    out = dict(fig)
    if stage:
        if stage.get("title") and (is_generic_figure(fig) or is_placeholder_title(fig.get("title", ""))):
            out["title"] = str(stage["title"])
        if stage.get("description"):
            out["description"] = str(stage["description"])
        if stage.get("key_concept"):
            out["teaching_points"] = str(stage["key_concept"])
        elif stage.get("title") and is_generic_figure(fig):
            out["teaching_points"] = f"本步骤重点：{stage['title']}"
        if stage.get("question"):
            out["key_question"] = str(stage["question"])
        if stage.get("figure_reference") and is_placeholder_title(out.get("figure_number", "")):
            out["figure_number"] = str(stage["figure_reference"])
    if ecg_detail and not out.get("description"):
        out["description"] = ecg_detail
    return out


def enrich_figures(content: dict[str, Any]) -> tuple[list[dict], list[int]]:
    """Returns (figures, indices_still_generic)."""
    ecg = content.get("ecg_findings") or {}
    if isinstance(ecg, list):
        ecg = {"details": ecg}
    figures = list(ecg.get("figures") or [])
    if not figures:
        urls = content.get("image_urls") or []
        for i, url in enumerate(urls):
            figures.append(
                {
                    "figure_number": f"图{i + 1}",
                    "title": f"PDF 页面 {i + 1}",
                    "description": "",
                    "teaching_points": "请观察图中的心电图/腔内图特征",
                    "key_question": "你在这张图中观察到了什么？请描述关键特征。",
                    "image_url": url,
                }
            )

    stages = content.get("learning_stages") or []
    details = ecg.get("details") or []

    enriched: list[dict] = []
    still_generic: list[int] = []
    for i, fig in enumerate(figures):
        stage = get_stage_for_figure(stages, i)
        detail = details[i] if i < len(details) else None
        ef = enrich_figure_from_stage(fig, stage, detail)
        enriched.append(ef)
        if is_generic_figure(ef):
            still_generic.append(i)

    return enriched, still_generic


def ai_enrich_figures(
    client: OpenAI,
    model: str,
    case: dict[str, Any],
    content: dict[str, Any],
    figures: list[dict],
    generic_indices: list[int],
) -> list[dict]:
    if not generic_indices:
        return figures

    payload_figs = []
    for i in generic_indices:
        f = figures[i]
        payload_figs.append(
            {
                "index": i,
                "figure_number": f.get("figure_number", f"图{i + 1}"),
                "title": f.get("title", ""),
            }
        )

    case_summary = {
        "title": case.get("title", ""),
        "category": case.get("category", ""),
        "difficulty": case.get("difficulty", ""),
        "description": case.get("description", ""),
        "final_diagnosis": content.get("final_diagnosis", ""),
        "key_points": content.get("key_points") or case.get("key_points") or [],
        "learning_stages": content.get("learning_stages") or [],
        "ecg_summary": (content.get("ecg_findings") or {}).get("summary", "")
        if isinstance(content.get("ecg_findings"), dict)
        else "",
        "ecg_details": (content.get("ecg_findings") or {}).get("details", [])
        if isinstance(content.get("ecg_findings"), dict)
        else [],
    }

    prompt = f"""你是心脏电生理教学编辑。根据病例信息，为以下每张图片生成中文苏格拉底式教学元数据。

病例信息：
{json.dumps(case_summary, ensure_ascii=False, indent=2)}

需要补充的图片（index 为 figures 数组下标）：
{json.dumps(payload_figs, ensure_ascii=False, indent=2)}

要求：
1. 每张图必须有不同的 title、description、teaching_points、key_question
2. key_question 必须是开放式苏格拉底提问，不能是/否题
3. 内容必须基于病例已有信息推断，不要编造具体测量值
4. 按 EP 教学逻辑递进：ECG → 腔内图 → 标测 → 消融 → 验证
5. 保留 figure_number 原值，只更新 title/description/teaching_points/key_question

输出 JSON：
{{
  "figures": [
    {{
      "index": 0,
      "title": "中文步骤标题",
      "description": "本图展示内容的简要描述",
      "teaching_points": "教学要点",
      "key_question": "苏格拉底式开放式提问"
    }}
  ]
}}"""

    resp = client.chat.completions.create(
        model=model,
        max_tokens=4096,
        temperature=0.5,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "输出合法 JSON，所有内容为中文。"},
            {"role": "user", "content": prompt},
        ],
    )
    raw = resp.choices[0].message.content or "{}"
    data = json.loads(raw)
    updates = {item["index"]: item for item in data.get("figures", [])}

    result = [dict(f) for f in figures]
    for idx in generic_indices:
        u = updates.get(idx)
        if not u:
            continue
        if u.get("title"):
            result[idx]["title"] = u["title"]
        if u.get("description"):
            result[idx]["description"] = u["description"]
        if u.get("teaching_points"):
            result[idx]["teaching_points"] = u["teaching_points"]
        if u.get("key_question"):
            result[idx]["key_question"] = u["key_question"]
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--skip-ai", action="store_true", help="Only apply learning_stages mapping")
    args = parser.parse_args()

    env = load_env()
    supabase = create_client(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
    ai_client = None
    model = env.get("DEEPSEEK_MODEL", "deepseek-chat")
    if not args.skip_ai and env.get("DEEPSEEK_API_KEY"):
        ai_client = OpenAI(
            api_key=env["DEEPSEEK_API_KEY"],
            base_url=env.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        )

    resp = supabase.from_("cases").select("id, title, category, difficulty, description, key_points, content_json").execute()
    cases = resp.data or []
    print(f"Total cases: {len(cases)}", flush=True)

    updated = 0
    stage_only = 0
    ai_updated = 0
    skipped = 0
    errors = 0

    for i, case in enumerate(cases):
        if args.limit and i >= args.limit:
            break

        content = case.get("content_json") or {}
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                content = {}

        figures, generic_indices = enrich_figures(content)
        if not figures:
            skipped += 1
            continue

        before_generic = sum(1 for f in figures if is_generic_figure(f))
        if before_generic == 0:
            skipped += 1
            continue

        need_ai = generic_indices
        if ai_client and need_ai and not args.skip_ai and not args.dry_run:
            try:
                figures = ai_enrich_figures(ai_client, model, case, content, figures, need_ai)
                ai_updated += 1
                time.sleep(0.5)
            except Exception as e:
                print(f"  AI FAIL {case['title'][:50]}: {e}", flush=True)
                errors += 1

        after_generic = sum(1 for f in figures if is_generic_figure(f))
        if after_generic == before_generic and before_generic == len(figures):
            # nothing improved
            if not need_ai or args.skip_ai:
                skipped += 1
                continue

        ecg = content.get("ecg_findings") or {}
        if isinstance(ecg, list):
            ecg = {"details": ecg}
        ecg["figures"] = figures
        content["ecg_findings"] = ecg

        print(f"[{'DRY' if args.dry_run else 'OK'}] {case['title'][:55]}", flush=True)
        print(f"  figures={len(figures)} generic: {before_generic} -> {after_generic}", flush=True)
        if figures:
            print(f"  sample Q: {figures[min(1, len(figures)-1)].get('key_question','')[:70]}", flush=True)

        if not args.dry_run:
            try:
                supabase.from_("cases").update({"content_json": content}).eq("id", case["id"]).execute()
                updated += 1
            except Exception as e:
                print(f"  DB FAIL: {e}")
                errors += 1
        else:
            updated += 1

        if before_generic > after_generic and after_generic > 0:
            stage_only += 1

    print(f"\n{'=' * 60}")
    print(f"Processed/updated: {updated}")
    print(f"AI calls: {ai_updated}")
    print(f"Skipped (no figures or already ok): {skipped}")
    print(f"Errors: {errors}")


if __name__ == "__main__":
    main()
