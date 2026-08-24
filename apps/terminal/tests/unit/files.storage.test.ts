import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_FILES_SUBVIEW_KEY,
  readActiveFilesSubview,
  readWorkspaceFolder,
  WORKSPACE_FOLDER_KEY,
  writeActiveFilesSubview,
  writeWorkspaceFolder,
} from "../../src/modules/files/files.storage";

restoreJsdomLocalStorage();

describe("files.storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("active subview persistence", () => {
    it("returns default explorer when no subview is stored", () => {
      expect(readActiveFilesSubview()).toBe("explorer");
    });

    it("persists and reads source-control subview", () => {
      expect(writeActiveFilesSubview("source-control")).toBe(true);
      expect(readActiveFilesSubview()).toBe("source-control");
      expect(localStorage.getItem(ACTIVE_FILES_SUBVIEW_KEY)).toBe("source-control");
    });

    it("falls back to explorer on invalid stored key", () => {
      localStorage.setItem(ACTIVE_FILES_SUBVIEW_KEY, "invalid-view");
      expect(readActiveFilesSubview()).toBe("explorer");
    });

    it("handles storage exceptions gracefully", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      expect(readActiveFilesSubview()).toBe("explorer");
    });
  });

  describe("workspace folder persistence", () => {
    it("returns null when no folder is stored", () => {
      expect(readWorkspaceFolder()).toBeNull();
    });

    it("persists and reads workspace folder path", () => {
      const path = "C:\\Storage\\Development\\MyRepo";
      expect(writeWorkspaceFolder(path)).toBe(true);
      expect(readWorkspaceFolder()).toBe(path);
      expect(localStorage.getItem(WORKSPACE_FOLDER_KEY)).toBe(path);
    });

    it("clears workspace folder when null or empty string is passed", () => {
      localStorage.setItem(WORKSPACE_FOLDER_KEY, "C:\\test");
      expect(writeWorkspaceFolder(null)).toBe(true);
      expect(readWorkspaceFolder()).toBeNull();
      expect(localStorage.getItem(WORKSPACE_FOLDER_KEY)).toBeNull();
    });

    it("handles storage exceptions gracefully", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      expect(writeWorkspaceFolder("C:\\test")).toBe(false);
    });
  });
});

function restoreJsdomLocalStorage(): void {
  const jsdomStorage = (window as unknown as { _localStorage?: Storage })._localStorage;
  if (!jsdomStorage) {
    return;
  }

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    get: () => jsdomStorage,
  });
}
