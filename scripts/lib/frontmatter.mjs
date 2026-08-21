/**
 * Minimal YAML-frontmatter parser for Cursor .mdc / SKILL.md files.
 * Supports `key: value`, booleans, and indented `- item` lists. No nested objects.
 */

/**
 * @param {string} text
 * @returns {{ frontmatter: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized };
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    return { frontmatter: {}, body: normalized };
  }
  const yaml = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  return { frontmatter: parseSimpleYaml(yaml), body };
}

/**
 * @param {string} yaml
 * @returns {Record<string, unknown>}
 */
function parseSimpleYaml(yaml) {
  /** @type {Record<string, unknown>} */
  const out = {};
  const lines = yaml.split("\n");
  /** @type {string | null} */
  let listKey = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const listItem = /^[ \t]+-[ \t]+(.+)$/.exec(raw);
    if (listItem && listKey) {
      const list = Array.isArray(out[listKey]) ? out[listKey] : [];
      list.push(unquote(listItem[1].trim()));
      out[listKey] = list;
      continue;
    }
    const kv = /^([A-Za-z0-9_]+):[ \t]*(.*)$/.exec(raw);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2];
    if (value === "") {
      listKey = key;
      out[key] = [];
      continue;
    }
    listKey = null;
    out[key] = coerceScalar(unquote(value.trim()));
  }
  return out;
}

/**
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * @param {string} value
 * @returns {string | boolean}
 */
function coerceScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {string}
 */
export function stringifyFrontmatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
      continue;
    }
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
      continue;
    }
    if (typeof value === "string" && /^[A-Za-z0-9_]+$/.test(value)) {
      lines.push(`${key}: ${value}`);
      continue;
    }
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}
