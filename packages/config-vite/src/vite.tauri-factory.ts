import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import type { UserConfig } from "vite";
import type { TauriViteFactoryOptions } from "./vite.tauri-factory.types.ts";

/**
 * Shared Vite config for GenCore's Tauri apps, following the official
 * Tauri + Vite integration guide (fixed dev port, `src-tauri` watch
 * exclusion, `TAURI_ENV_*` env exposure, and Chromium/WebKit build targets).
 */
export function createTauriViteConfig({ port }: TauriViteFactoryOptions): UserConfig {
  const host = process.env.TAURI_DEV_HOST;
  const isDebugBuild = Boolean(process.env.TAURI_ENV_DEBUG);

  return {
    clearScreen: false,
    server: {
      port,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: port + 1,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
    envPrefix: ["VITE_", "TAURI_ENV_*"],
    build: {
      // Tauri uses Chromium on Windows and WebKit on macOS/Linux.
      target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
      minify: isDebugBuild ? false : "esbuild",
      sourcemap: isDebugBuild,
    },
    plugins: [
      react(),
      tailwindcss(),
      babel({
        presets: [reactCompilerPreset({ compilationMode: "infer" })],
      }),
    ],
  };
}
