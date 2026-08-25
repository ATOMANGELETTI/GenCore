import type { LucideIcon } from "lucide-react";
import { Binary, Hash, Monitor, Moon, Sun } from "lucide-react";
import type { FileSizeFormat, ThemePreference } from "./config.types";

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

export const FILE_SIZE_FORMAT_OPTIONS: readonly {
  id: FileSizeFormat;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}[] = [
  { id: "binary", title: "Binary (KiB, MiB)", subtitle: "1 KiB = 1024 bytes", Icon: Binary },
  { id: "decimal", title: "Decimal (KB, MB)", subtitle: "1 KB = 1000 bytes", Icon: Hash },
];

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
