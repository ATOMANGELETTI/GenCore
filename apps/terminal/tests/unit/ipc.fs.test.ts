import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock,
}));

describe("ipc.fs", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    listenMock.mockReset();
  });

  it("invokes list_drives with no args and returns DriveEntry[]", async () => {
    const { listDrives } = await import("../../src/modules/ipc/ipc.fs");
    const drives = [{ name: "C:", path: "C:\\", kind: "fixed", label: "System" }];
    invokeMock.mockResolvedValueOnce(drives);

    const result = await listDrives();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-fs|list_drives");
    expect(result).toEqual(drives);
  });

  it("invokes list with a path-only payload", async () => {
    const { listDir } = await import("../../src/modules/ipc/ipc.fs");
    const listing = { entries: [{ name: "a.txt", path: "C:\\a.txt", kind: "file" }] };
    invokeMock.mockResolvedValueOnce(listing);

    const result = await listDir("C:\\work");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-fs|list", { path: "C:\\work" });
    expect(result).toEqual(listing);
  });

  it("invokes create_file with a path-only payload", async () => {
    const { createFile } = await import("../../src/modules/ipc/ipc.fs");
    invokeMock.mockResolvedValueOnce(undefined);

    await createFile("C:\\work\\a.txt");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-fs|create_file", {
      path: "C:\\work\\a.txt",
    });
  });

  it("invokes create_dir with a path-only payload", async () => {
    const { createDir } = await import("../../src/modules/ipc/ipc.fs");
    invokeMock.mockResolvedValueOnce(undefined);

    await createDir("C:\\work\\folder");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-fs|create_dir", {
      path: "C:\\work\\folder",
    });
  });

  it("invokes watch with path and recursive false", async () => {
    const { watchDir } = await import("../../src/modules/ipc/ipc.fs");
    invokeMock.mockResolvedValueOnce(undefined);

    await watchDir("C:\\work");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-fs|watch", {
      path: "C:\\work",
      recursive: false,
    });
  });

  it("invokes unwatch with a path-only payload", async () => {
    const { unwatchDir } = await import("../../src/modules/ipc/ipc.fs");
    invokeMock.mockResolvedValueOnce(undefined);

    await unwatchDir("C:\\work");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-fs|unwatch", { path: "C:\\work" });
  });

  it("subscribes to gencore-fs://entry-changed and returns the unlisten function", async () => {
    const unlisten = vi.fn();
    listenMock.mockResolvedValueOnce(unlisten);
    const { subscribeFsChanges } = await import("../../src/modules/ipc/ipc.fs");
    const handler = vi.fn();

    const result = await subscribeFsChanges(handler);

    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(listenMock.mock.calls[0]?.[0]).toBe("gencore-fs://entry-changed");
    expect(result).toBe(unlisten);

    const listenHandler = listenMock.mock.calls[0]?.[1] as (event: {
      payload: { parent: string; kind: string };
    }) => void;
    listenHandler({ payload: { parent: "C:\\work", kind: "created" } });
    expect(handler).toHaveBeenCalledWith({ parent: "C:\\work", kind: "created" });
  });
});
