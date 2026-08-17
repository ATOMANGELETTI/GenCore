#!/usr/bin/env node
// Strip Cursor/AI co-author and Made-with trailers from a git commit message file.
// Used by the Husky commit-msg hook before commitlint.

import { readFileSync, writeFileSync } from "node:fs";

const AI_IN_TRAILER =
  /cursoragent@cursor\.com|\bcursor\b|\bcopilot\b|\bchatgpt\b|\bclaude\b|\bopenai\b|\banthropic\b|\bgemini\b|\bAI\b/i;

/**
 * @param {string} line
 * @returns {boolean}
 */
export function isAiAttributionLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const coAuthor = /^Co-authored-by:\s*(.+)$/i.exec(trimmed);
  if (coAuthor) return AI_IN_TRAILER.test(coAuthor[1]);

  if (/^Made-with:\s*Cursor\b/i.test(trimmed)) return true;
  if (/^Made with Cursor\b/i.test(trimmed)) return true;

  const generated = /^(Generated-by|Assisted-by):\s*(.+)$/i.exec(trimmed);
  if (generated) return AI_IN_TRAILER.test(generated[2]);

  return false;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function stripAiCommitTrailers(text) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const kept = lines.filter((line) => !isAiAttributionLine(line));

  while (kept.length > 0 && kept[kept.length - 1].trim() === "") {
    kept.pop();
  }

  if (kept.length === 0) return "";
  return `${kept.join(newline)}${newline}`;
}

function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === new URL(`file://${entry.replaceAll("\\", "/")}`).href
    || process.argv[1].replaceAll("\\", "/").endsWith("strip-ai-commit-trailers.mjs");
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write("usage: node scripts/strip-ai-commit-trailers.mjs <commit-msg-file>\n");
    process.exit(1);
  }

  const original = readFileSync(filePath, "utf8");
  writeFileSync(filePath, stripAiCommitTrailers(original), "utf8");
}

if (isMain()) {
  main();
}
