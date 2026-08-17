import type { FileIconKindId, FileIconResolveInput } from "./file-icon.types";

const EXTENSION_KIND: Record<string, FileIconKindId> = {
  ts: "ts",
  tsx: "tsx",
  js: "js",
  jsx: "jsx",
  mjs: "js",
  cjs: "js",
  json: "json",
  jsonc: "json",
  toml: "toml",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  html: "html",
  css: "css",
  scss: "css",
  sass: "css",
  markdown: "md",
  md: "md",
  txt: "txt",
  rs: "rs",
  py: "py",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "cpp",
  hpp: "cpp",
  cs: "cs",
  sh: "sh",
  ps1: "ps1",
  sql: "sql",
  svg: "svg",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  ico: "image",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  ogg: "audio",
  mp4: "video",
  webm: "video",
  mov: "video",
  mkv: "video",
  pdf: "pdf",
  zip: "archive",
  gz: "archive",
  "7z": "archive",
  tar: "archive",
  rar: "archive",
  exe: "exe",
  dll: "exe",
  msi: "exe",
  lock: "lock",
  env: "env",
  gitignore: "git",
  gitattributes: "git",
  dockerfile: "docker",
  ttf: "font",
  otf: "font",
  woff: "font",
  woff2: "font",
  log: "log",
};

function normalizeExtension(extension: string | undefined): string | undefined {
  if (extension == null) {
    return undefined;
  }

  const normalized = extension.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.startsWith(".") ? normalized.slice(1) : normalized;
}

export function resolveFileIconKind({
  nodeKind,
  extension,
  open,
}: FileIconResolveInput): FileIconKindId {
  if (nodeKind === "drive") {
    return "drive";
  }

  if (nodeKind === "folder") {
    return open === true ? "folder-open" : "folder";
  }

  const key = normalizeExtension(extension);
  if (key == null) {
    return "file";
  }

  return EXTENSION_KIND[key] ?? "file";
}
