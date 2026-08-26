import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { SearchEngineId, ThemePreference } from "./config.types";

export const THEME_OPTIONS: readonly {
  id: ThemePreference;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  { id: "polar-night", title: "Polar Night", subtitle: "Dark Nord palette", Icon: Moon },
  { id: "snow-storm", title: "Snow Storm", subtitle: "Light Nord palette", Icon: Sun },
  { id: "system", title: "Match system", subtitle: "Follow Windows light or dark", Icon: Monitor },
];

export const SEARCH_ENGINES: Readonly<Record<SearchEngineId, { title: string; url: string }>> = {
  duckduckgo: { title: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
  google: { title: "Google", url: "https://www.google.com/search?q=" },
  bing: { title: "Bing", url: "https://www.bing.com/search?q=" },
};

export const SEARCH_ENGINE_OPTIONS: readonly { id: SearchEngineId; title: string }[] = (
  Object.keys(SEARCH_ENGINES) as SearchEngineId[]
).map((id) => ({ id, title: SEARCH_ENGINES[id].title }));

export const DEFAULT_HOMEPAGE_URL = "https://duckduckgo.com";

export const SECTION_LABEL_CLASS =
  "mb-1.5 mt-3 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0";

export function nextRadioIndex(
  key: string,
  currentIndex: number,
  length: number,
): number | undefined {
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1) % length;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + length) % length;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return length - 1;
  }
  return undefined;
}
