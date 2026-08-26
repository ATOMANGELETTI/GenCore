import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.browser-store", () => {
  it("loads and saves bookmarks", async () => {
    const { loadBookmarks, saveBookmarks } = await import(
      "../../src/modules/ipc/ipc.browser-store"
    );
    invokeMock.mockResolvedValueOnce('{"version":1,"bookmarks":[]}');

    await loadBookmarks();
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|load_bookmarks");

    invokeMock.mockResolvedValueOnce(undefined);
    await saveBookmarks('{"version":1,"bookmarks":[]}');
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|save_bookmarks", {
      json: '{"version":1,"bookmarks":[]}',
    });
  });

  it("loads and saves history", async () => {
    const { loadHistory, saveHistory } = await import("../../src/modules/ipc/ipc.browser-store");
    invokeMock.mockResolvedValueOnce('{"version":1,"entries":[]}');

    await loadHistory();
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|load_history");

    invokeMock.mockResolvedValueOnce(undefined);
    await saveHistory('{"version":1,"entries":[]}');
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|save_history", {
      json: '{"version":1,"entries":[]}',
    });
  });

  it("loads and saves downloads", async () => {
    const { loadDownloads, saveDownloads } = await import(
      "../../src/modules/ipc/ipc.browser-store"
    );
    invokeMock.mockResolvedValueOnce('{"version":1,"downloads":[]}');

    await loadDownloads();
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|load_downloads");

    invokeMock.mockResolvedValueOnce(undefined);
    await saveDownloads('{"version":1,"downloads":[]}');
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|save_downloads", {
      json: '{"version":1,"downloads":[]}',
    });
  });
});
