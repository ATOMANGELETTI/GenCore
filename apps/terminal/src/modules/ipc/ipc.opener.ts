import { openUrl } from "@tauri-apps/plugin-opener";

export const GENCORE_REPO_URL = "https://github.com/ATOMANGELETTI/GenCore";

export function openRepoInBrowser(): Promise<void> {
  return openUrl(GENCORE_REPO_URL);
}
