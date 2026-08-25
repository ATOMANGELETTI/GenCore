import type { FileSizeFormat } from "../config/config.types";
import type { FsEntry } from "../ipc/ipc.types";

const BINARY_UNITS = ["bytes", "KiB", "MiB", "GiB", "TiB"] as const;
const DECIMAL_UNITS = ["bytes", "KB", "MB", "GB", "TB"] as const;

export function formatSize(size: number | null, unit: FileSizeFormat = "binary"): string {
  if (size == null) {
    return "—";
  }
  if (size === 0) {
    return "0 bytes";
  }

  const base = unit === "decimal" ? 1000 : 1024;
  const units = unit === "decimal" ? DECIMAL_UNITS : BINARY_UNITS;
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(base)), units.length - 1);
  const value = size / base ** exponent;
  const precision = exponent === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;
  const rounded = Number.parseFloat(value.toFixed(precision));
  return `${rounded} ${units[exponent]}`;
}

export function formatModified(modifiedMs: number | null): string {
  if (modifiedMs == null) {
    return "—";
  }

  const date = new Date(modifiedMs);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) {
    return `Today ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `Yesterday ${time}`;
  }

  return `${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} ${time}`;
}

/** Returns `base`, or `base (2)`, `base (3)`, … the first name not already in `existingNames`. */
export function uniqueEntryName(existingNames: readonly string[], base: string): string {
  const taken = new Set(existingNames.map((name) => name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) {
    return base;
  }
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${base} (${index})`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return base;
}

/** Strips the extension from `entry.name` when extensions are hidden by config. */
export function displayName(
  entry: Pick<FsEntry, "name" | "kind" | "extension">,
  showFileExtensions: boolean,
): string {
  if (showFileExtensions || entry.kind !== "file" || !entry.extension) {
    return entry.name;
  }
  const suffix = `.${entry.extension}`;
  return entry.name.endsWith(suffix) ? entry.name.slice(0, -suffix.length) : entry.name;
}

export function typeLabel(entry: Pick<FsEntry, "kind" | "extension">): string {
  if (entry.kind === "dir") {
    return "File folder";
  }
  if (entry.extension) {
    return `${entry.extension.toUpperCase()} File`;
  }
  return entry.kind === "symlink" ? "Shortcut" : "File";
}
