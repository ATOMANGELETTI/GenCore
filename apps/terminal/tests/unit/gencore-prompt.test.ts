import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const promptScript = readFileSync(
  resolve(process.cwd(), "src-tauri/resources/oh-my-posh/gencore-prompt.ps1"),
  "utf8",
);

function preferenceAssignments(source: string): string[] {
  return [...source.matchAll(/\$ErrorActionPreference\s*=\s*'([^']+)'/gi)].map(
    (match) => match[1] ?? "",
  );
}

describe("gencore-prompt.ps1 preference hygiene", () => {
  it("does not leave SilentlyContinue as the last ErrorActionPreference", () => {
    const assignments = preferenceAssignments(promptScript);
    const last = assignments.at(-1);
    expect(last?.toLowerCase()).not.toBe("silentlycontinue");
  });

  it("quiets only Get-Command oh-my-posh", () => {
    expect(promptScript).toMatch(/Get-Command\s+oh-my-posh\s+-ErrorAction\s+SilentlyContinue/);
  });
});
