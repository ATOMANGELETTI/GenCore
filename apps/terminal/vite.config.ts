import { createTauriViteConfig } from "@gencore/config-vite";
import { defineConfig } from "vite";

// See https://v2.tauri.app/start/frontend/vite/ for the official Tauri + Vite setup.
export default defineConfig(createTauriViteConfig({ port: 5173 }));
