import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn(() => Promise.resolve());
const listen = vi.fn(() => Promise.resolve(() => undefined));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

describe("ipc.fs", () => {
  beforeEach(() => {
    invoke.mockClear();
    listen.mockClear();
  });

  it("listDir invokes list with a path", async () => {
    const { listDir } = await import("../../src/modules/ipc/ipc.fs");
    await listDir("C:\\Users\\dev");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|list", { path: "C:\\Users\\dev" });
  });

  it("listDrives invokes list_drives with no args", async () => {
    const { listDrives } = await import("../../src/modules/ipc/ipc.fs");
    await listDrives();
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|list_drives");
  });

  it("statPath invokes stat with a path", async () => {
    const { statPath } = await import("../../src/modules/ipc/ipc.fs");
    await statPath("C:\\a.txt");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|stat", { path: "C:\\a.txt" });
  });

  it("renamePath invokes rename with snake_case new_name", async () => {
    const { renamePath } = await import("../../src/modules/ipc/ipc.fs");
    await renamePath("C:\\a.txt", "b.txt");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|rename", {
      path: "C:\\a.txt",
      new_name: "b.txt",
    });
  });

  it("deletePaths invokes delete with a paths array", async () => {
    const { deletePaths } = await import("../../src/modules/ipc/ipc.fs");
    await deletePaths(["C:\\a.txt", "C:\\b.txt"]);
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|delete", {
      paths: ["C:\\a.txt", "C:\\b.txt"],
    });
  });

  it("copyPaths invokes copy with snake_case destination_dir", async () => {
    const { copyPaths } = await import("../../src/modules/ipc/ipc.fs");
    await copyPaths(["C:\\a.txt"], "C:\\dest");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|copy", {
      paths: ["C:\\a.txt"],
      destination_dir: "C:\\dest",
    });
  });

  it("movePaths invokes move_paths with snake_case destination_dir", async () => {
    const { movePaths } = await import("../../src/modules/ipc/ipc.fs");
    await movePaths(["C:\\a.txt"], "C:\\dest");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|move_paths", {
      paths: ["C:\\a.txt"],
      destination_dir: "C:\\dest",
    });
  });

  it("watchDir invokes watch with recursive:false", async () => {
    const { watchDir } = await import("../../src/modules/ipc/ipc.fs");
    await watchDir("C:\\Users\\dev");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|watch", {
      path: "C:\\Users\\dev",
      recursive: false,
    });
  });

  it("unwatchDir invokes unwatch with a path", async () => {
    const { unwatchDir } = await import("../../src/modules/ipc/ipc.fs");
    await unwatchDir("C:\\Users\\dev");
    expect(invoke).toHaveBeenCalledWith("plugin:gencore-fs|unwatch", { path: "C:\\Users\\dev" });
  });

  it("subscribeFsChanges listens for gencore-fs://entry-changed", async () => {
    const { subscribeFsChanges } = await import("../../src/modules/ipc/ipc.fs");
    await subscribeFsChanges(() => undefined);
    expect(listen).toHaveBeenCalledWith("gencore-fs://entry-changed", expect.any(Function));
  });
});
