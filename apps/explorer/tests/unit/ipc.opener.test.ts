import { describe, expect, it, vi } from "vitest";

const openUrl = vi.fn(() => Promise.resolve());

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl,
}));

describe("ipc.opener", () => {
  it("opens the GenCore GitHub URL through openUrl", async () => {
    const { GENCORE_REPO_URL, openRepoInBrowser } = await import(
      "../../src/modules/ipc/ipc.opener"
    );

    await openRepoInBrowser();

    expect(GENCORE_REPO_URL).toBe("https://github.com/ATOMANGELETTI/GenCore");
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith("https://github.com/ATOMANGELETTI/GenCore");
  });
});
