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
    document.querySelector('[data-slot="content-area"]')?.remove();
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

  it("copy and cut call execCommand", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    expect(copySelection()).toBe(true);
    expect(cutSelection()).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(exec).toHaveBeenCalledWith("cut");
    exec.mockRestore();
  });

  it("copy, cut, and paste return false when execCommand is missing", async () => {
    const execCommand = document.execCommand;
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("abc")) },
    });

    try {
      expect(copySelection()).toBe(false);
      expect(cutSelection()).toBe(false);
      expect(await pasteText()).toBe(false);
    } finally {
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        writable: true,
        value: execCommand,
      });
    }
  });

  it("selectAllContent selects the content-area node", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    const area = document.createElement("div");
    area.setAttribute("data-slot", "content-area");
    area.textContent = "hello world";
    document.body.appendChild(area);

    expect(selectAllContent()).toBe(true);
    expect(window.getSelection()?.toString()).toBe("hello world");
    expect(exec).not.toHaveBeenCalled();

    area.remove();
    exec.mockRestore();
  });

  it("selectAllContent returns false when the content-area node is missing", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    expect(document.querySelector('[data-slot="content-area"]')).toBeNull();
    expect(selectAllContent()).toBe(false);
    expect(exec).not.toHaveBeenCalled();
    exec.mockRestore();
  });

  it("canReadClipboard never calls readText", async () => {
    const readText = vi.fn(() => Promise.resolve("secret"));
    const query = vi.fn(() => Promise.resolve({ state: "granted" }));
    vi.stubGlobal("navigator", {
      clipboard: { readText },
      permissions: { query },
    });

    expect(await canReadClipboard()).toBe(true);
    expect(readText).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith({ name: "clipboard-read" });
  });

  it("canReadClipboard is false when clipboard-read is denied", async () => {
    const readText = vi.fn(() => Promise.resolve("secret"));
    vi.stubGlobal("navigator", {
      clipboard: { readText },
      permissions: { query: vi.fn(() => Promise.resolve({ state: "denied" })) },
    });

    expect(await canReadClipboard()).toBe(false);
    expect(readText).not.toHaveBeenCalled();
  });

  it("canReadClipboard is true when clipboard-read is granted or prompt", async () => {
    const readText = vi.fn(() => Promise.reject(new Error("should not read")));

    vi.stubGlobal("navigator", {
      clipboard: { readText },
      permissions: { query: vi.fn(() => Promise.resolve({ state: "granted" })) },
    });
    expect(await canReadClipboard()).toBe(true);

    vi.stubGlobal("navigator", {
      clipboard: { readText },
      permissions: { query: vi.fn(() => Promise.resolve({ state: "prompt" })) },
    });
    expect(await canReadClipboard()).toBe(true);
    expect(readText).not.toHaveBeenCalled();
  });

  it("canReadClipboard is false when the clipboard API is missing", async () => {
    vi.stubGlobal("navigator", {});
    expect(await canReadClipboard()).toBe(false);
  });

  it("canReadClipboard is true when Permissions API is missing but readText exists", async () => {
    const readText = vi.fn(() => Promise.reject(new Error("should not read")));
    vi.stubGlobal("navigator", {
      clipboard: { readText },
    });

    expect(await canReadClipboard()).toBe(true);
    expect(readText).not.toHaveBeenCalled();
  });

  it("canReadClipboard is true when permissions.query throws", async () => {
    const readText = vi.fn(() => Promise.reject(new Error("should not read")));
    vi.stubGlobal("navigator", {
      clipboard: { readText },
      permissions: { query: vi.fn(() => Promise.reject(new Error("unsupported"))) },
    });

    expect(await canReadClipboard()).toBe(true);
    expect(readText).not.toHaveBeenCalled();
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
