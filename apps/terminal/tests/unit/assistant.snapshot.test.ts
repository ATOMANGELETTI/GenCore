import { describe, expect, it } from "vitest";
import {
  buildSnapshot,
  lastLines,
  MAX_OUTPUT_EXCERPT_CHARS,
} from "../../src/modules/assistant/assistant.snapshot";

it("keeps the last N lines and caps length", () => {
  expect(lastLines("a\nb\nc\nd", 2)).toBe("c\nd");
});

it("copies active session id and files selection", () => {
  const snap = buildSnapshot({
    tabs: [
      {
        id: "t1",
        name: "Tab",
        pinned: false,
        cwd: "C:\\src",
        sessionId: "sess-1",
        status: "live",
        error: null,
      },
    ],
    activeId: "t1",
    readScrollback: () => "line1\nline2",
    contextLines: 80,
    filesSelection: { path: "C:\\src\\app.rs", kind: "file" },
  });
  expect(snap.active_session_id).toBe("sess-1");
  expect(snap.files_selection).toEqual({ path: "C:\\src\\app.rs", kind: "file" });
  expect(snap.output_excerpt).toBe("line1\nline2");
});

describe("lastLines", () => {
  it("returns the whole text when there are fewer lines than n", () => {
    expect(lastLines("a\nb", 80)).toBe("a\nb");
  });

  it("returns an empty string when n is zero or negative", () => {
    expect(lastLines("a\nb\nc", 0)).toBe("");
    expect(lastLines("a\nb\nc", -1)).toBe("");
  });
});

describe("buildSnapshot", () => {
  const BASE_TAB = {
    id: "t1",
    name: null,
    pinned: false,
    cwd: null,
    sessionId: null,
    status: "live" as const,
    error: null,
  };

  it("omits active_session_id, cwd, and files_selection when unset", () => {
    const snap = buildSnapshot({
      tabs: [BASE_TAB],
      activeId: "t1",
      readScrollback: () => "",
      contextLines: 80,
      filesSelection: null,
    });

    expect(snap.active_session_id).toBeUndefined();
    expect(snap.cwd).toBeUndefined();
    expect(snap.files_selection).toBeUndefined();
    expect(snap.active_tab_id).toBe("t1");
    expect(snap.output_excerpt).toBe("");
  });

  it("still sends a snapshot when the active tab has no live session", () => {
    const snap = buildSnapshot({
      tabs: [{ ...BASE_TAB, sessionId: null, cwd: "C:\\work" }],
      activeId: "t1",
      readScrollback: () => "boot log",
      contextLines: 80,
      filesSelection: null,
    });

    expect(snap.active_session_id).toBeUndefined();
    expect(snap.cwd).toBe("C:\\work");
    expect(snap.output_excerpt).toBe("boot log");
  });

  it("caps output_excerpt at 65536 characters, keeping the tail", () => {
    const overflow = `HEAD-${"x".repeat(MAX_OUTPUT_EXCERPT_CHARS)}`;
    const snap = buildSnapshot({
      tabs: [BASE_TAB],
      activeId: "t1",
      readScrollback: () => overflow,
      contextLines: 1,
      filesSelection: null,
    });

    expect(snap.output_excerpt.length).toBeLessThanOrEqual(MAX_OUTPUT_EXCERPT_CHARS);
    expect(snap.output_excerpt.startsWith("HEAD-")).toBe(false);
    expect(snap.output_excerpt.endsWith("x")).toBe(true);
  });

  it("maps each tab to id/name/cwd/pinned only, dropping null fields", () => {
    const snap = buildSnapshot({
      tabs: [
        { ...BASE_TAB, id: "a", name: "Build", cwd: "C:\\work", pinned: true },
        { ...BASE_TAB, id: "b" },
      ],
      activeId: "a",
      readScrollback: () => "",
      contextLines: 80,
      filesSelection: null,
    });

    expect(snap.tabs).toEqual([
      { id: "a", name: "Build", cwd: "C:\\work", pinned: true },
      { id: "b", pinned: false },
    ]);
  });
});
