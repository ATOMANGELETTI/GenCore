import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PtyExitPayload } from "../../src/modules/ipc/ipc.types";
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

let exitHandler: ((payload: PtyExitPayload) => void) | null = null;

vi.mock("../../src/modules/ipc/ipc.pty", () => ({
  openPty: (...args: unknown[]) => openPty(...(args as [])),
  writePty: (...args: unknown[]) => writePty(...(args as [])),
  resizePty: (...args: unknown[]) => resizePty(...(args as [])),
  closePty: (...args: unknown[]) => closePty(...(args as [])),
  subscribePtyData: () => Promise.resolve(() => undefined),
  subscribePtyExit: (handler: (payload: PtyExitPayload) => void) => {
    exitHandler = handler;
    return Promise.resolve(() => undefined);
  },
}));

vi.mock("../../src/modules/ipc/ipc.pinned", () => ({
  loadPinnedTabs: () => Promise.reject(new Error("no pinned file")),
  savePinnedTabs: () => Promise.resolve(),
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
  exitHandler = null;
  session = null;
  openPty.mockClear();
  writePty.mockClear();
  resizePty.mockClear();
  closePty.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TerminalProvider session lifecycle", () => {
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
});
