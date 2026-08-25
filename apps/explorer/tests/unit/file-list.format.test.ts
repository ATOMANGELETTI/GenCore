import { describe, expect, it } from "vitest";
import {
  displayName,
  formatSize,
  typeLabel,
  uniqueEntryName,
} from "../../src/modules/file-list/file-list.format";

describe("file-list.format", () => {
  describe("formatSize", () => {
    it("renders a dash for null", () => {
      expect(formatSize(null)).toBe("—");
    });

    it("renders 0 bytes literally", () => {
      expect(formatSize(0)).toBe("0 bytes");
    });

    it("renders bytes without decimals", () => {
      expect(formatSize(512)).toBe("512 bytes");
    });

    it("renders binary units (KiB/MiB) by default with sensible precision", () => {
      expect(formatSize(2048)).toBe("2 KiB");
      expect(formatSize(1_572_864)).toBe("1.5 MiB");
    });

    it("renders decimal units (KB/MB) when requested", () => {
      expect(formatSize(2000, "decimal")).toBe("2 KB");
      expect(formatSize(1_500_000, "decimal")).toBe("1.5 MB");
    });
  });

  describe("typeLabel", () => {
    it("labels directories as File folder", () => {
      expect(typeLabel({ kind: "dir", extension: null })).toBe("File folder");
    });

    it("labels files by uppercased extension", () => {
      expect(typeLabel({ kind: "file", extension: "pdf" })).toBe("PDF File");
    });

    it("falls back to File for extensionless files", () => {
      expect(typeLabel({ kind: "file", extension: null })).toBe("File");
    });

    it("labels extensionless symlinks as Shortcut", () => {
      expect(typeLabel({ kind: "symlink", extension: null })).toBe("Shortcut");
    });
  });

  describe("uniqueEntryName", () => {
    it("returns the base name when it is not taken", () => {
      expect(uniqueEntryName(["a.txt"], "New folder")).toBe("New folder");
    });

    it("suffixes with (2), (3), … on collision", () => {
      expect(uniqueEntryName(["New folder"], "New folder")).toBe("New folder (2)");
      expect(uniqueEntryName(["New folder", "New folder (2)"], "New folder")).toBe(
        "New folder (3)",
      );
    });

    it("is case-insensitive when checking collisions", () => {
      expect(uniqueEntryName(["NEW FOLDER"], "New folder")).toBe("New folder (2)");
    });
  });

  describe("displayName", () => {
    it("returns the full name when extensions are shown", () => {
      expect(displayName({ name: "report.pdf", kind: "file", extension: "pdf" }, true)).toBe(
        "report.pdf",
      );
    });

    it("strips the extension when extensions are hidden", () => {
      expect(displayName({ name: "report.pdf", kind: "file", extension: "pdf" }, false)).toBe(
        "report",
      );
    });

    it("never strips a directory's name", () => {
      expect(displayName({ name: "archive.old", kind: "dir", extension: "old" }, false)).toBe(
        "archive.old",
      );
    });
  });
});
