export { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.mjs";

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
  return body
    .replace(
      /7\. Add the app's dev port to `\.cursor\/environment\.json` `ports` if it needs cloud\n {3}preview \(coordinate with the controller — this file is shared\)\.\n/,
      "7. Do not register the app port in `.cursor/environment.json` — that file is Cursor-only.\n",
    )
    .replace(
      "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.mcp.json`, or any ad-hoc",
      "- No shadow MCP servers: do not add `.cursor/mcp.json`, `.agents/mcp_config.json`, `.mcp.json`, or any ad-hoc",
    );
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
