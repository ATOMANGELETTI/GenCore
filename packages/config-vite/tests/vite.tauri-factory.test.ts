import { afterEach, describe, expect, it, vi } from "vitest";
import { createTauriViteConfig } from "../src/vite.tauri-factory";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createTauriViteConfig", () => {
  it("pins the dev server to the requested port", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.port).toBe(1420);
    expect(config.server?.strictPort).toBe(true);
    expect(config.clearScreen).toBe(false);
  });

  it("ignores src-tauri and node_modules except @gencore workspace packages", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.watch?.ignored).toEqual([
      "**/src-tauri/**",
      "**/node_modules/**",
      "!**/node_modules/@gencore/**",
    ]);
  });

  it("exposes VITE_ and TAURI_ENV_ prefixed env vars", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.envPrefix).toEqual(["VITE_", "TAURI_ENV_*"]);
  });

  it("registers the react, tailwindcss, and babel plugins", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.plugins).toHaveLength(3);
  });

  it("enables localhost HMR on the app port when TAURI_DEV_HOST is unset", () => {
    vi.stubEnv("TAURI_DEV_HOST", "");
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.hmr).toEqual({
      protocol: "ws",
      host: "localhost",
      clientPort: 1420,
    });
  });

  it("uses a dedicated HMR port when TAURI_DEV_HOST is set", () => {
    vi.stubEnv("TAURI_DEV_HOST", "0.0.0.0");
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.host).toBe("0.0.0.0");
    expect(config.server?.hmr).toEqual({
      protocol: "ws",
      host: "0.0.0.0",
      port: 1421,
    });
  });

  it("disables watcher polling unless GENCORE_VITE_POLL is 1", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.watch?.usePolling).toBe(false);
  });

  it("enables watcher polling when GENCORE_VITE_POLL is 1", () => {
    vi.stubEnv("GENCORE_VITE_POLL", "1");
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.server?.watch?.usePolling).toBe(true);
  });

  it("excludes @gencore/ui-kit from dependency prebundling", () => {
    const config = createTauriViteConfig({ port: 1420 });

    expect(config.optimizeDeps?.exclude).toEqual(["@gencore/ui-kit"]);
  });
});
