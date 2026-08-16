import { createTauriViteConfig } from "@gencore/config-vite";
import { defineConfig } from "vite";

export default defineConfig(createTauriViteConfig({ port: 5174 }));
