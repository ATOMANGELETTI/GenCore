export { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.mjs";

import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.mjs";

export const SKIP_RULE_FILES = new Set(["superpowers-models.mdc"]);
export const MAX_RULE_CHARS = 12000;
export const READ_ONLY_TOOLS = ["view_file", "grep_search", "find_by_name", "list_dir"];
export const DEBUGGER_TOOLS = [...READ_ONLY_TOOLS, "run_command"];

/**
 * @param {string} sourceRel
 * @returns {string}
 */
export function GENERATED_HEADER(sourceRel) {
  return `<!-- Generated from ${sourceRel} by \`pnpm sync:agents\`. Do not edit. -->\n`;
}

/**
 * @param {string} body
 * @returns {string}
 */
export function rewriteAgyBody(body) {
  const withEnv = body.replace(
    /^(\d+)\.\s+[^\n]*\.cursor\/environment\.json[^\n]*(?:\n[ \t-].*)*/gm,
    "$1. Do not register the app port in `.cursor/environment.json` — that file is Cursor-only.",
  );
  const withExactMcp = withEnv.replace(
    "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.mcp.json`, or any ad-hoc",
    "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.agents/mcp_config.json`, `.mcp.json`, or any ad-hoc",
  );
  return withExactMcp.replace(/^.*\.mcp\.json.*$/gm, (line) => {
    if (line.includes(".agents/mcp_config.json")) return line;
    if (line.includes("`.cursor/mcp.json`")) {
      return line.replace("`.cursor/mcp.json`", "`.cursor/mcp.json`, `.agents/mcp_config.json`");
    }
    if (line.includes("`.mcp.json`")) {
      return line.replace("`.mcp.json`", "`.agents/mcp_config.json`, `.mcp.json`");
    }
    return line.replace(".mcp.json", ".agents/mcp_config.json, .mcp.json");
  });
}

/**
 * @param {string} globs
 * @returns {string[]}
 */
function splitGlobs(globs) {
  return globs
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

/**
 * @param {{ filename: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string } | null}
 */
export function convertRule({ filename, text, sourceRel }) {
  if (SKIP_RULE_FILES.has(filename)) return null;
  const { frontmatter, body } = parseFrontmatter(text);
  const globs = typeof frontmatter.globs === "string" ? splitGlobs(frontmatter.globs) : [];
  /** @type {Record<string, unknown>} */
  const fields = {};
  if (globs.length > 0) {
    fields.trigger = "glob";
    fields.globs = globs;
  } else if (frontmatter.alwaysApply === true) {
    fields.trigger = "always_on";
  } else {
    fields.trigger = "model_decision";
  }
  if (typeof frontmatter.description === "string") {
    fields.description = frontmatter.description;
  }
  const stem = filename.replace(/\.mdc$/i, "");
  const content =
    `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(body)}`.replace(
      /^\uFEFF/,
      "",
    );
  if (content.length > MAX_RULE_CHARS) {
    throw new Error(
      `${sourceRel} converts to ${content.length} characters (limit ${MAX_RULE_CHARS})`,
    );
  }
  return { relPath: `rules/${stem}.md`, content };
}

/**
 * @param {{ name: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string }}
 */
export function convertSkill({ name, text, sourceRel }) {
  const { frontmatter, body } = parseFrontmatter(text);
  const fields = {
    name: typeof frontmatter.name === "string" ? frontmatter.name : name,
    description: typeof frontmatter.description === "string" ? frontmatter.description : name,
  };
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(body)}`;
  return { relPath: `skills/${name}/SKILL.md`, content };
}

/**
 * @param {{ filename: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string }}
 */
export function convertCommand({ filename, text, sourceRel }) {
  const { frontmatter, body } = parseFrontmatter(text);
  const name = filename.replace(/\.md$/i, "");
  const source = body.trim() ? body : text;
  const firstLine =
    source
      .trim()
      .split("\n")
      .find((line) => line.trim()) ?? name;
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description : firstLine.trim();
  const fields = { name, description };
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(source)}`;
  return { relPath: `workflows/${name}.md`, content };
}

/**
 * @param {{ filename: string, text: string, sourceRel: string }} input
 * @returns {{ relPath: string, content: string }}
 */
export function convertAgent({ filename, text, sourceRel }) {
  const { frontmatter, body } = parseFrontmatter(text);
  const name =
    typeof frontmatter.name === "string" ? frontmatter.name : filename.replace(/\.md$/i, "");
  const readonly = frontmatter.readonly === true;
  const fields = {
    name,
    description: typeof frontmatter.description === "string" ? frontmatter.description : name,
    subagent: true,
    mainAgent: false,
    tools: readonly ? READ_ONLY_TOOLS : DEBUGGER_TOOLS,
  };
  const content = `${stringifyFrontmatter(fields)}\n${GENERATED_HEADER(sourceRel)}\n${rewriteAgyBody(body)}`;
  return { relPath: `agents/${name}/agent.md`, content };
}

export const CURSOR_SKIP_TOP = new Set([
  "environment.json",
  "Dockerfile",
  "worktrees.json",
  "setup-worktree-unix.sh",
  "setup-worktree-windows.ps1",
  "hooks.json",
  "hooks",
]);

export const CURSOR_CONVERT_TOP = new Set(["rules", "skills", "commands", "agents"]);
export const GENERATED_TOP = ["rules", "skills", "workflows", "agents"];

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function listNames(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.map((e) => e.name);
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * @param {string} repoRoot
 * @returns {Promise<Map<string, string>>}
 */
export async function planGeneratedFiles(repoRoot) {
  const cursorRoot = path.join(repoRoot, ".cursor");
  const names = await listNames(cursorRoot);
  for (const name of names) {
    if (CURSOR_SKIP_TOP.has(name) || CURSOR_CONVERT_TOP.has(name)) continue;
    throw new Error(
      `Unknown .cursor/${name}. Add it to CURSOR_SKIP_TOP or CURSOR_CONVERT_TOP in scripts/lib/sync-agents.mjs.`,
    );
  }

  /** @type {Map<string, string>} */
  const planned = new Map();

  const rulesDir = path.join(cursorRoot, "rules");
  for (const filename of await listNames(rulesDir)) {
    if (!filename.endsWith(".mdc")) continue;
    const sourceRel = `.cursor/rules/${filename}`;
    const text = await readFile(path.join(rulesDir, filename), "utf8");
    const converted = convertRule({ filename, text, sourceRel });
    if (converted) planned.set(converted.relPath, converted.content);
  }

  const skillsDir = path.join(cursorRoot, "skills");
  for (const name of await listNames(skillsDir)) {
    const skillFile = path.join(skillsDir, name, "SKILL.md");
    const text = await readFile(skillFile, "utf8");
    const converted = convertSkill({
      name,
      text,
      sourceRel: `.cursor/skills/${name}/SKILL.md`,
    });
    planned.set(converted.relPath, converted.content);
  }

  const commandsDir = path.join(cursorRoot, "commands");
  for (const filename of await listNames(commandsDir)) {
    if (!filename.endsWith(".md")) continue;
    const text = await readFile(path.join(commandsDir, filename), "utf8");
    const converted = convertCommand({
      filename,
      text,
      sourceRel: `.cursor/commands/${filename}`,
    });
    planned.set(converted.relPath, converted.content);
  }

  const agentsDir = path.join(cursorRoot, "agents");
  for (const filename of await listNames(agentsDir)) {
    if (!filename.endsWith(".md")) continue;
    const text = await readFile(path.join(agentsDir, filename), "utf8");
    const converted = convertAgent({
      filename,
      text,
      sourceRel: `.cursor/agents/${filename}`,
    });
    planned.set(converted.relPath, converted.content);
  }

  return planned;
}

/**
 * @param {string} dir
 * @param {string} prefix
 * @param {string[]} acc
 * @returns {Promise<string[]>}
 */
async function listGeneratedFiles(dir, prefix, acc = []) {
  let names;
  try {
    names = await readdir(dir);
  } catch (err) {
    if (err && err.code === "ENOENT") return acc;
    throw err;
  }
  for (const name of names) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const info = await stat(abs);
    if (info.isDirectory()) {
      await listGeneratedFiles(abs, rel.replace(/\\/g, "/"), acc);
    } else {
      acc.push(rel.replace(/\\/g, "/"));
    }
  }
  return acc;
}

/**
 * @param {string} repoRoot
 * @param {{ check?: boolean }} [opts]
 */
export async function syncAgents(repoRoot, opts = {}) {
  const check = opts.check === true;
  const planned = await planGeneratedFiles(repoRoot);
  const agentsRoot = path.join(repoRoot, ".agents");
  /** @type {string[]} */
  const changed = [];

  for (const top of GENERATED_TOP) {
    const existing = await listGeneratedFiles(path.join(agentsRoot, top), top);
    for (const rel of existing) {
      if (!planned.has(rel)) changed.push(rel);
    }
  }

  for (const [rel, content] of planned) {
    const abs = path.join(agentsRoot, ...rel.split("/"));
    let current = null;
    try {
      current = await readFile(abs, "utf8");
    } catch {
      current = null;
    }
    if (current !== content) changed.push(rel);
  }

  const unique = [...new Set(changed)].sort();
  if (check) {
    return { status: unique.length === 0 ? "clean" : "dirty", changed: unique };
  }
  if (unique.length === 0) {
    return { status: "clean", changed: [] };
  }

  for (const top of GENERATED_TOP) {
    const existing = await listGeneratedFiles(path.join(agentsRoot, top), top);
    for (const rel of existing) {
      if (!planned.has(rel)) {
        await rm(path.join(agentsRoot, ...rel.split("/")), { force: true });
      }
    }
  }

  for (const [rel, content] of planned) {
    const abs = path.join(agentsRoot, ...rel.split("/"));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
  }

  return { status: "wrote", changed: unique };
}
