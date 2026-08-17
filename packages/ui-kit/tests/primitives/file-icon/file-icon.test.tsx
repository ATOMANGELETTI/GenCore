import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FileIconKindId, FileIconResolveInput } from "../../../src/primitives/file-icon";
import { FileIcon, resolveFileIconKind } from "../../../src/primitives/file-icon";

describe("resolveFileIconKind", () => {
  it("returns drive and ignores extension", () => {
    expect(resolveFileIconKind({ nodeKind: "drive" })).toBe("drive");
    expect(resolveFileIconKind({ nodeKind: "drive", extension: "ts" })).toBe("drive");
    expect(resolveFileIconKind({ nodeKind: "drive", extension: "gitignore", open: true })).toBe(
      "drive",
    );
  });

  it("returns folder-open when a folder is open", () => {
    expect(resolveFileIconKind({ nodeKind: "folder", open: true })).toBe("folder-open");
    expect(resolveFileIconKind({ nodeKind: "folder", extension: "ts", open: true })).toBe(
      "folder-open",
    );
  });

  it("returns folder when a folder is closed", () => {
    expect(resolveFileIconKind({ nodeKind: "folder" })).toBe("folder");
    expect(resolveFileIconKind({ nodeKind: "folder", open: false })).toBe("folder");
    expect(resolveFileIconKind({ nodeKind: "folder", extension: "json" })).toBe("folder");
  });

  it.each([
    ["ts", "ts"],
    ["tsx", "tsx"],
    ["js", "js"],
    ["jsx", "jsx"],
    ["mjs", "js"],
    ["cjs", "js"],
    ["json", "json"],
    ["jsonc", "json"],
    ["toml", "toml"],
    ["yml", "yaml"],
    ["yaml", "yaml"],
    ["xml", "xml"],
    ["html", "html"],
    ["css", "css"],
    ["scss", "css"],
    ["sass", "css"],
    ["markdown", "md"],
    ["md", "md"],
    ["txt", "txt"],
    ["rs", "rs"],
    ["py", "py"],
    ["go", "go"],
    ["java", "java"],
    ["c", "c"],
    ["cpp", "cpp"],
    ["h", "cpp"],
    ["hpp", "cpp"],
    ["cs", "cs"],
    ["sh", "sh"],
    ["ps1", "ps1"],
    ["sql", "sql"],
    ["svg", "svg"],
    ["png", "image"],
    ["jpg", "image"],
    ["jpeg", "image"],
    ["gif", "image"],
    ["webp", "image"],
    ["ico", "image"],
    ["mp3", "audio"],
    ["wav", "audio"],
    ["flac", "audio"],
    ["ogg", "audio"],
    ["mp4", "video"],
    ["webm", "video"],
    ["mov", "video"],
    ["mkv", "video"],
    ["pdf", "pdf"],
    ["zip", "archive"],
    ["gz", "archive"],
    ["7z", "archive"],
    ["tar", "archive"],
    ["rar", "archive"],
    ["exe", "exe"],
    ["dll", "exe"],
    ["msi", "exe"],
    ["lock", "lock"],
    ["env", "env"],
    ["gitignore", "git"],
    ["gitattributes", "git"],
    ["dockerfile", "docker"],
    ["ttf", "font"],
    ["otf", "font"],
    ["woff", "font"],
    ["woff2", "font"],
    ["log", "log"],
  ] as const)("maps file extension %s to %s", (extension, kind) => {
    expect(resolveFileIconKind({ nodeKind: "file", extension })).toBe(kind);
  });

  it("lowercases the extension and strips a leading dot", () => {
    expect(resolveFileIconKind({ nodeKind: "file", extension: ".TS" })).toBe("ts");
    expect(resolveFileIconKind({ nodeKind: "file", extension: "PNG" })).toBe("image");
    expect(resolveFileIconKind({ nodeKind: "file", extension: ".gitignore" })).toBe("git");
  });

  it("maps unknown or missing file extensions to file", () => {
    expect(resolveFileIconKind({ nodeKind: "file" })).toBe("file");
    expect(resolveFileIconKind({ nodeKind: "file", extension: "unknown" })).toBe("file");
    expect(resolveFileIconKind({ nodeKind: "file", extension: "" })).toBe("file");
  });
});

const KIND_INPUT: Record<FileIconKindId, FileIconResolveInput> = {
  drive: { nodeKind: "drive" },
  folder: { nodeKind: "folder" },
  "folder-open": { nodeKind: "folder", open: true },
  file: { nodeKind: "file", extension: "unknown" },
  ts: { nodeKind: "file", extension: "ts" },
  tsx: { nodeKind: "file", extension: "tsx" },
  js: { nodeKind: "file", extension: "js" },
  jsx: { nodeKind: "file", extension: "jsx" },
  json: { nodeKind: "file", extension: "json" },
  toml: { nodeKind: "file", extension: "toml" },
  yaml: { nodeKind: "file", extension: "yaml" },
  xml: { nodeKind: "file", extension: "xml" },
  html: { nodeKind: "file", extension: "html" },
  css: { nodeKind: "file", extension: "css" },
  md: { nodeKind: "file", extension: "md" },
  txt: { nodeKind: "file", extension: "txt" },
  rs: { nodeKind: "file", extension: "rs" },
  py: { nodeKind: "file", extension: "py" },
  go: { nodeKind: "file", extension: "go" },
  java: { nodeKind: "file", extension: "java" },
  c: { nodeKind: "file", extension: "c" },
  cpp: { nodeKind: "file", extension: "cpp" },
  cs: { nodeKind: "file", extension: "cs" },
  sh: { nodeKind: "file", extension: "sh" },
  ps1: { nodeKind: "file", extension: "ps1" },
  sql: { nodeKind: "file", extension: "sql" },
  svg: { nodeKind: "file", extension: "svg" },
  image: { nodeKind: "file", extension: "png" },
  audio: { nodeKind: "file", extension: "mp3" },
  video: { nodeKind: "file", extension: "mp4" },
  pdf: { nodeKind: "file", extension: "pdf" },
  archive: { nodeKind: "file", extension: "zip" },
  exe: { nodeKind: "file", extension: "exe" },
  lock: { nodeKind: "file", extension: "lock" },
  env: { nodeKind: "file", extension: "env" },
  git: { nodeKind: "file", extension: "gitignore" },
  docker: { nodeKind: "file", extension: "dockerfile" },
  font: { nodeKind: "file", extension: "ttf" },
  log: { nodeKind: "file", extension: "log" },
};

describe("FileIcon", () => {
  it("sets data-kind to the resolved id", () => {
    const { container } = render(<FileIcon nodeKind="file" extension="ts" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("data-slot", "file-icon");
    expect(svg).toHaveAttribute("data-kind", "ts");
    expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
    expect(svg).toHaveClass("size-4");
  });

  it.each([
    ["drive", { nodeKind: "drive" as const, extension: "ts" }, "drive"],
    ["folder-open", { nodeKind: "folder" as const, open: true }, "folder-open"],
    ["unknown file", { nodeKind: "file" as const, extension: "xyz" }, "file"],
    ["mjs alias", { nodeKind: "file" as const, extension: "mjs" }, "js"],
  ])("sets data-kind for %s", (_label, props, kind) => {
    const { container } = render(<FileIcon {...props} />);
    expect(container.querySelector("svg")).toHaveAttribute("data-kind", kind);
  });

  it("renders a distinct path geometry for each kind", () => {
    const geometries = new Map<string, FileIconKindId>();

    for (const [kind, props] of Object.entries(KIND_INPUT) as [
      FileIconKindId,
      FileIconResolveInput,
    ][]) {
      const { container, unmount } = render(<FileIcon {...props} />);
      const svg = container.querySelector("svg");
      const geometry = serializeGlyphGeometry(svg);

      expect(svg).toHaveAttribute("data-kind", kind);
      expect(geometry.length).toBeGreaterThan(0);
      expect(geometries.has(geometry), `geometry collision with ${geometries.get(geometry)}`).toBe(
        false,
      );
      geometries.set(geometry, kind);
      unmount();
    }

    expect(geometries.size).toBe(Object.keys(KIND_INPUT).length);
  });
});

function serializeGlyphGeometry(svg: Element | null): string {
  if (!svg) {
    return "";
  }

  return [...svg.children]
    .map((node) => {
      const tag = node.tagName.toLowerCase();
      const d = node.getAttribute("d") ?? "";
      const rule = node.getAttribute("fill-rule") ?? "";
      const cx = node.getAttribute("cx") ?? "";
      const cy = node.getAttribute("cy") ?? "";
      const r = node.getAttribute("r") ?? "";
      return `${tag}:${d}:${rule}:${cx}:${cy}:${r}`;
    })
    .join("|");
}
