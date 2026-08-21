import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock,
}));

describe("ipc.pty", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
  });

  it("invokes open with flattened cols and rows", async () => {
    const { openPty } = await import("../../src/modules/ipc/ipc.pty");
    invokeMock.mockResolvedValueOnce({ session_id: "session-1" });

    const result = await openPty({ cols: 80, rows: 24 });

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-pty|open", { cols: 80, rows: 24 });
    expect(result).toEqual({ session_id: "session-1" });
  });

  it("invokes write with session_id and data", async () => {
    const { writePty } = await import("../../src/modules/ipc/ipc.pty");
    invokeMock.mockResolvedValueOnce(undefined);

    await writePty("session-1", "hi");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-pty|write", {
      session_id: "session-1",
      data: "hi",
    });
  });

  it("invokes resize with session_id, cols, and rows", async () => {
    const { resizePty } = await import("../../src/modules/ipc/ipc.pty");
    invokeMock.mockResolvedValueOnce(undefined);

    await resizePty("session-1", 100, 40);

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-pty|resize", {
      session_id: "session-1",
      cols: 100,
      rows: 40,
    });
  });

  it("invokes close with session_id only", async () => {
    const { closePty } = await import("../../src/modules/ipc/ipc.pty");
    invokeMock.mockResolvedValueOnce(undefined);

    await closePty("session-1");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-pty|close", {
      session_id: "session-1",
    });
  });

  it("subscribes to gencore-pty://data and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribePtyData } = await import("../../src/modules/ipc/ipc.pty");
    const handler = vi.fn();

    const result = await subscribePtyData(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-pty://data");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { session_id: string; data: string };
    }) => void;
    listenHandler({ payload: { session_id: "session-1", data: "YQ==" } });
    expect(handler).toHaveBeenCalledWith({ session_id: "session-1", data: "YQ==" });
  });

  it("subscribes to gencore-pty://exit and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribePtyExit } = await import("../../src/modules/ipc/ipc.pty");
    const handler = vi.fn();

    const result = await subscribePtyExit(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-pty://exit");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { session_id: string; code: number | null };
    }) => void;
    listenHandler({ payload: { session_id: "session-1", code: 0 } });
    expect(handler).toHaveBeenCalledWith({ session_id: "session-1", code: 0 });
  });
});
