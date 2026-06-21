import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env.local
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

  const { data, error } = await supabase
    .from("cases")
    .update({ is_published: true })
    .eq("is_published", false)
    .select("id, title");

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log(`Published ${data.length} cases:`);
  data.forEach((c: { id: string; title: string }, i: number) =>
    console.log(`  ${i + 1}. ${c.title}`)
  );
}

main();
