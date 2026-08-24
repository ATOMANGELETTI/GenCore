import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PtyDataPayload, PtyExitPayload } from "../../src/modules/ipc/ipc.types";
import {
  MAX_PTY_WRITE_CHARS,
  TerminalProvider,
  useTerminalSession,
} from "../../src/modules/terminal/terminal.hook";
import type { TerminalSessionApi } from "../../src/modules/terminal/terminal.types";

const openPty = vi.fn(() => Promise.resolve({ session_id: "session-1" }));
const writePty = vi.fn(() => Promise.resolve());
const resizePty = vi.fn(() => Promise.resolve());
const closePty = vi.fn(() => Promise.resolve());
const savePinnedTabs = vi.fn(() => Promise.resolve());

let dataHandler: ((payload: PtyDataPayload) => void) | null = null;
let exitHandler: ((payload: PtyExitPayload) => void) | null = null;
let holdDataListen = false;
let releaseDataListen: (() => void) | null = null;
let rejectDataListen: Error | null = null;
let rejectExitListen: Error | null = null;

vi.mock("../../src/modules/ipc/ipc.pty", () => ({
  openPty: (...args: unknown[]) => openPty(...(args as [])),
  writePty: (...args: unknown[]) => writePty(...(args as [])),
  resizePty: (...args: unknown[]) => resizePty(...(args as [])),
  closePty: (...args: unknown[]) => closePty(...(args as [])),
  subscribePtyData: (handler: (payload: PtyDataPayload) => void) => {
    dataHandler = handler;
    if (rejectDataListen) {
      return Promise.reject(rejectDataListen);
    }
    if (holdDataListen) {
      return new Promise<() => void>((resolve) => {
        releaseDataListen = () => resolve(() => undefined);
      });
    }
    return Promise.resolve(() => undefined);
  },
  subscribePtyExit: (handler: (payload: PtyExitPayload) => void) => {
    exitHandler = handler;
    if (rejectExitListen) {
      return Promise.reject(rejectExitListen);
    }
    return Promise.resolve(() => undefined);
  },
}));

vi.mock("../../src/modules/ipc/ipc.pinned", () => ({
  loadPinnedTabs: () => Promise.reject(new Error("no pinned file")),
  savePinnedTabs: (...args: unknown[]) => savePinnedTabs(...(args as [])),
}));

vi.mock("@gencore/ui-kit", () => ({
  useTheme: () => ({ theme: "polar-night" as const }),
}));

let session: TerminalSessionApi | null = null;

function Probe() {
  session = useTerminalSession();
  return null;
}

function renderProvider() {
  return render(
    <TerminalProvider>
      <Probe />
    </TerminalProvider>,
  );
}

async function liveTab(): Promise<{ id: string; sessionId: string }> {
  await waitFor(() => {
    expect(session?.tabs[0]?.sessionId).toBe("session-1");
  });
  const tab = session?.tabs[0];
  if (!tab?.sessionId) {
    throw new Error("expected a live tab");
  }
  return { id: tab.id, sessionId: tab.sessionId };
}

beforeEach(() => {
  holdDataListen = false;
  rejectDataListen = null;
  rejectExitListen = null;
  dataHandler = null;
  releaseDataListen = null;
  exitHandler = null;
  session = null;
  openPty.mockClear();
  // A few tests below override this with `mockImplementation` and never
  // restore it; re-apply the default here so later tests are not left
  // depending on run order to see "session-1".
  openPty.mockImplementation(() => Promise.resolve({ session_id: "session-1" }));
  writePty.mockClear();
  resizePty.mockClear();
  closePty.mockClear();
  savePinnedTabs.mockClear();
  savePinnedTabs.mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TerminalProvider session lifecycle", () => {
  it("does not spawn when subscribePtyData rejects", async () => {
    rejectDataListen = new Error("IPC command is not allowlisted by the isolation hook");
    renderProvider();

    await waitFor(() => {
      expect(session?.tabs).toHaveLength(1);
    });
    expect(openPty).not.toHaveBeenCalled();
    expect(session?.tabs[0]?.status).toBe("exited");
    expect(session?.tabs[0]?.sessionId).toBeNull();
    expect(session?.tabs[0]?.error).toContain("not allowlisted");
  });

  it("does not spawn when subscribePtyExit rejects after data listen", async () => {
    rejectExitListen = new Error("exit listen failed");
    renderProvider();

    await waitFor(() => {
      expect(session?.tabs).toHaveLength(1);
    });
    expect(openPty).not.toHaveBeenCalled();
    expect(session?.tabs[0]?.status).toBe("exited");
    expect(session?.tabs[0]?.error).toContain("exit listen failed");
  });

  it("does not save pinned tabs when closing a subscribe-failure tab", async () => {
    rejectDataListen = new Error("IPC command is not allowlisted by the isolation hook");
    renderProvider();

    await waitFor(() => {
      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0]?.status).toBe("exited");
    });
    const tabId = session?.tabs[0]?.id ?? "";
    savePinnedTabs.mockClear();

    session?.closeTab(tabId);

    expect(savePinnedTabs).not.toHaveBeenCalled();
  });

  it("does not open a pty until data listen resolves", async () => {
    holdDataListen = true;
    renderProvider();

    await Promise.resolve();
    await Promise.resolve();
    expect(openPty).not.toHaveBeenCalled();

    releaseDataListen?.();

    await waitFor(() => {
      expect(openPty).toHaveBeenCalled();
    });
  });

  it("closes the pty session reported by the exit payload", async () => {
    renderProvider();
    const tab = await liveTab();

    exitHandler?.({ session_id: tab.sessionId, code: 0 });

    await waitFor(() => {
      expect(session?.tabs[0]?.status).toBe("exited");
    });
    expect(closePty).toHaveBeenCalledWith("session-1");
    expect(session?.tabs[0]?.sessionId).toBeNull();
  });

  it("ignores an exit payload for a session no tab owns", async () => {
    renderProvider();
    await liveTab();

    exitHandler?.({ session_id: "session-stale", code: 1 });

    await waitFor(() => {
      expect(closePty).toHaveBeenCalledWith("session-stale");
    });
    expect(session?.tabs[0]?.status).toBe("live");
    expect(session?.tabs[0]?.sessionId).toBe("session-1");
  });

  it("restarts an exited tab on Enter with a fresh session", async () => {
    renderProvider();
    const tab = await liveTab();

    exitHandler?.({ session_id: tab.sessionId, code: 0 });
    await waitFor(() => {
      expect(session?.tabs[0]?.status).toBe("exited");
    });

    openPty.mockResolvedValueOnce({ session_id: "session-2" });
    session?.onTerminalInput(tab.id, "\r");

    await waitFor(() => {
      expect(session?.tabs[0]?.sessionId).toBe("session-2");
    });
    expect(session?.tabs[0]?.status).toBe("live");
  });

  it("splits an oversized paste into Isolation-sized writes", async () => {
    renderProvider();
    const tab = await liveTab();
    const paste = "x".repeat(MAX_PTY_WRITE_CHARS + 10);

    session?.onTerminalInput(tab.id, paste);

    await waitFor(() => {
      expect(writePty).toHaveBeenCalledTimes(2);
    });
    const sent = writePty.mock.calls.map((call) => (call as unknown as [string, string])[1]);
    expect(sent.join("")).toBe(paste);
    for (const chunk of sent) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_PTY_WRITE_CHARS);
    }
    expect(session?.tabs[0]?.status).toBe("live");
  });

  it("keeps the tab live when a write fails for any reason but SessionNotFound", async () => {
    renderProvider();
    const tab = await liveTab();
    writePty.mockRejectedValueOnce(
      new Error("IPC command is not allowlisted by the isolation hook"),
    );

    session?.onTerminalInput(tab.id, "ls\r");

    await waitFor(() => {
      expect(writePty).toHaveBeenCalled();
    });
    expect(session?.tabs[0]?.status).toBe("live");
    expect(session?.tabs[0]?.sessionId).toBe("session-1");
  });

  it("marks the tab exited when a write reports the session is gone", async () => {
    renderProvider();
    const tab = await liveTab();
    writePty.mockRejectedValueOnce(new Error("pty session not found"));

    session?.onTerminalInput(tab.id, "ls\r");

    await waitFor(() => {
      expect(session?.tabs[0]?.status).toBe("exited");
    });
    expect(session?.tabs[0]?.sessionId).toBeNull();
  });

  it("keeps the tab live when a resize fails for a reason other than SessionNotFound", async () => {
    renderProvider();
    await liveTab();
    resizePty.mockRejectedValueOnce(new Error("invalid dimensions"));

    session?.setViewport(120, 40);

    await waitFor(() => {
      expect(resizePty).toHaveBeenCalled();
    });
    expect(session?.tabs[0]?.status).toBe("live");
  });

  it("delivers data parked by session id after open assigns it", async () => {
    let resolveOpen: ((value: { session_id: string }) => void) | undefined;
    openPty.mockImplementation(
      () =>
        new Promise<{ session_id: string }>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    renderProvider();
    await waitFor(() => {
      expect(session?.tabs[0]?.id).toBeTruthy();
    });
    const tabId = session?.tabs[0]?.id ?? "";
    const writer = vi.fn();
    session?.registerWriter(tabId, writer);

    const dsr = btoa("\u001b[6n");
    dataHandler?.({ session_id: "session-1", data: dsr });
    expect(writer).not.toHaveBeenCalled();

    resolveOpen?.({ session_id: "session-1" });

    await waitFor(() => {
      expect(writer).toHaveBeenCalled();
    });
    const written = writer.mock.calls[0]?.[0] as Uint8Array;
    expect(new TextDecoder().decode(written)).toContain("\u001b[6n");
  });

  it("writes onTerminalInput after open resolves", async () => {
    let resolveOpen: ((value: { session_id: string }) => void) | undefined;
    openPty.mockImplementation(
      () =>
        new Promise<{ session_id: string }>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    renderProvider();
    await waitFor(() => {
      expect(session?.tabs[0]?.id).toBeTruthy();
    });
    const tabId = session?.tabs[0]?.id ?? "";
    session?.onTerminalInput(tabId, "\u001b[1;1R");
    expect(writePty).not.toHaveBeenCalled();

    resolveOpen?.({ session_id: "session-1" });

    await waitFor(() => {
      expect(writePty).toHaveBeenCalledWith("session-1", "\u001b[1;1R");
    });
  });

  it("drops orphan data when the tab is closed before open assigns the id", async () => {
    let resolveOpen: ((value: { session_id: string }) => void) | undefined;
    openPty.mockImplementation(
      () =>
        new Promise<{ session_id: string }>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    renderProvider();
    await waitFor(() => {
      expect(session?.tabs[0]?.id).toBeTruthy();
    });
    const firstId = session?.tabs[0]?.id ?? "";
    dataHandler?.({ session_id: "session-1", data: btoa("stale") });
    session?.closeTab(firstId);

    openPty.mockImplementation(() => Promise.resolve({ session_id: "session-2" }));
    resolveOpen?.({ session_id: "session-1" });

    await waitFor(() => {
      expect(session?.tabs[0]?.sessionId).toBe("session-2");
    });
    const writer = vi.fn();
    session?.registerWriter(session?.tabs[0]?.id ?? "", writer);
    expect(writer).not.toHaveBeenCalled();
  });

  it("flushes orphans parked while the writer was missing after session id exists", async () => {
    renderProvider();
    const tab = await liveTab();
    const dsr = btoa("\u001b[6n");
    dataHandler?.({ session_id: tab.sessionId, data: dsr });
    const writer = vi.fn();
    session?.registerWriter(tab.id, writer);
    expect(writer).toHaveBeenCalled();
    const written = writer.mock.calls[0]?.[0] as Uint8Array;
    expect(new TextDecoder().decode(written)).toContain("\u001b[6n");
  });

  it("replays startup bytes to a replacement writer after the first writer is disposed", async () => {
    renderProvider();
    const tab = await liveTab();
    const writer1 = vi.fn();
    const unregisterWriter1 = session?.registerWriter(tab.id, writer1);

    const dsr = btoa("\u001b[6n");
    dataHandler?.({ session_id: tab.sessionId, data: dsr });
    expect(writer1).toHaveBeenCalled();

    // Simulates a React StrictMode dev-mode remount disposing the first
    // xterm instance (and its writer) before it finishes parsing the DSR
    // it was handed directly.
    unregisterWriter1?.();
    const writer2 = vi.fn();
    session?.registerWriter(tab.id, writer2);

    expect(writer2).toHaveBeenCalled();
    const written = writer2.mock.calls[0]?.[0] as Uint8Array;
    expect(new TextDecoder().decode(written)).toContain("\u001b[6n");
  });

  it("does not replay the previous session's startup bytes after restart", async () => {
    renderProvider();
    const tab = await liveTab();
    const writer1 = vi.fn();
    session?.registerWriter(tab.id, writer1);

    const dsr = btoa("\u001b[6n");
    dataHandler?.({ session_id: tab.sessionId, data: dsr });
    expect(writer1).toHaveBeenCalled();

    openPty.mockResolvedValueOnce({ session_id: "session-2" });
    session?.restartTab(tab.id);

    await waitFor(() => {
      expect(session?.tabs[0]?.sessionId).toBe("session-2");
    });

    const writer2 = vi.fn();
    session?.registerWriter(tab.id, writer2);
    expect(writer2).not.toHaveBeenCalled();
  });

  it("openEditorTab creates an editor tab and spawns micro with target file", async () => {
    renderProvider();
    await liveTab();

    openPty.mockResolvedValueOnce({ session_id: "editor-session" });
    session?.openEditorTab("C:\\repo\\src\\main.rs");

    await waitFor(() => {
      expect(session?.tabs).toHaveLength(2);
      const editorTab = session?.tabs[1];
      expect(editorTab?.name).toBe("Diff: main.rs");
      expect(editorTab?.kind).toBe("editor");
      expect(editorTab?.diffFile).toBe("C:\\repo\\src\\main.rs");
      expect(editorTab?.command).toEqual(["micro", "C:\\repo\\src\\main.rs"]);
      expect(editorTab?.sessionId).toBe("editor-session");
    });

    expect(openPty).toHaveBeenCalledWith(
      expect.objectContaining({
        command: ["micro", "C:\\repo\\src\\main.rs"],
        cwd: "C:\\repo\\src",
      }),
    );
  });
});
