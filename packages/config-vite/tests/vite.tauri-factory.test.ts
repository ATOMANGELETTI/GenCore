import { describe, expect, it } from "vitest";
import { createTauriViteConfig } from "../src/vite.tauri-factory";

describe("createTauriViteConfig", () => {
  it("pins the dev server to the requested port", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.port).toBe(1420);
    expect(config.server?.strictPort).toBe(true);
    expect(config.clearScreen).toBe(false);
  });

  it("ignores src-tauri in the file watcher", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.watch?.ignored).toContain("**/src-tauri/**");
  });

  it("exposes VITE_ and TAURI_ENV_ prefixed env vars", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.envPrefix).toEqual(["VITE_", "TAURI_ENV_*"]);
  });

  it("registers the react, tailwindcss, and babel plugins", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.plugins).toHaveLength(3);
  });

  it("disables HMR when TAURI_DEV_HOST is unset", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.hmr).toBeUndefined();
  });
});
