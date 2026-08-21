#!/usr/bin/env node
import { syncAgents } from "./lib/sync-agents.mjs";

const check = process.argv.includes("--check");
const result = await syncAgents(process.cwd(), { check });

if (check && result.status === "dirty") {
  process.stderr.write(
    `.agents/ is out of sync. Run pnpm sync:agents.\nChanged:\n${result.changed.map((c) => `- ${c}`).join("\n")}\n`,
  );
  process.exit(1);
}

if (!check && result.status === "wrote") {
  process.stdout.write(`Wrote ${result.changed.length} .agents/ file(s).\n`);
}
