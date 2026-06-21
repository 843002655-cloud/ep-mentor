import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envPath = "E:\\fk claude\\ep-mentor\\.env.local";
const content = fs.readFileSync(envPath, "utf-8");
for (const line of content.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx < 0) continue;
  process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Total count
  const { count: total, error: e1 } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true });
  console.log("Total cases in DB:", total, e1?.message || "");

  // Published count
  const { count: published, error: e2 } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);
  console.log("Published cases:", published, e2?.message || "");

  // Unpublished count
  const { count: unpublished, error: e3 } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("is_published", false);
  console.log("Unpublished cases:", unpublished, e3?.message || "");

  // Show all case titles with id and is_published
  const { data: all, error: e4 } = await supabase
    .from("cases")
    .select("id, title, is_published, category, created_at")
    .order("created_at", { ascending: false });

  if (e4) { console.error("List error:", e4.message); return; }
  console.log(`\nAll ${all.length} cases:`);
  all.forEach((c: any, i: number) => {
    console.log(`  ${i+1}. [${c.is_published ? "PUB" : "DRF"}] ${c.title?.slice(0,60)} (${c.category})`);
  });
}

main();
