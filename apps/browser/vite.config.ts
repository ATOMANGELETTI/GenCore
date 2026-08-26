import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTauriViteConfig } from "@gencore/config-vite";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const base = createTauriViteConfig({ port: 5175 });

export default defineConfig({
  ...base,
  build: {
    ...base.build,
    rollupOptions: {
      ...base.build?.rollupOptions,
      input: {
        main: path.join(root, "index.html"),
        "tray-menu": path.join(root, "tray-menu.html"),
      },
    },
  },
});
