import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canReadClipboard,
  copySelection,
  cutSelection,
  hasTextSelection,
  pasteText,
  selectAllContent,
} from "../../src/modules/context-menu/context-menu.clipboard";

describe("context-menu.clipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.getSelection()?.removeAllRanges();
  });

  it("reports an empty selection as no text selection", () => {
    expect(hasTextSelection()).toBe(false);
  });

  it("reports a non-empty selection", () => {
    const selection = window.getSelection();
    const range = document.createRange();
    const node = document.createTextNode("hello");
    document.body.appendChild(node);
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(hasTextSelection()).toBe(true);
    node.remove();
  });

  it("copy, cut, and selectAll call execCommand", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    expect(copySelection()).toBe(true);
    expect(cutSelection()).toBe(true);
    expect(selectAllContent()).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(exec).toHaveBeenCalledWith("cut");
    expect(exec).toHaveBeenCalledWith("selectAll");
    exec.mockRestore();
  });

  it("canReadClipboard is false when readText throws", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });
    expect(await canReadClipboard()).toBe(false);
  });

  it("pasteText inserts clipboard text and returns false when empty", async () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("abc")) },
    });
    expect(await pasteText()).toBe(true);
    expect(exec).toHaveBeenCalledWith("insertText", false, "abc");

    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("")) },
    });
    expect(await pasteText()).toBe(false);
    exec.mockRestore();
  });
});
