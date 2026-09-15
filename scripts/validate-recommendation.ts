// Run by the coaching routine before it commits: `npm run coach:validate`.
// Uses the same validator as the dashboard, so a file that passes here renders.

import { readFileSync } from "fs";
import { parseRecommendation } from "../lib/coach";

const file = process.argv[2] ?? "data/recommendation.json";

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, "utf-8"));
} catch (err) {
  console.error(`${file}: tidak bisa dibaca sebagai JSON — ${(err as Error).message}`);
  process.exit(1);
}

const result = parseRecommendation(raw);
if (!result.ok) {
  console.error(`${file} tidak valid:`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `OK — readiness ${result.value.readiness}, ${result.value.programs.length} program: ` +
    result.value.programs.map((p) => p.title).join(", ")
);
