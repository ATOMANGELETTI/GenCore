export type LoadTone = "normal" | "warning" | "critical";

export function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(100, value)))}%`;
}

export function formatBytesPerSec(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.round(bytes)} B/s`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB/s`;
  }
  const mb = kb / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB/s`;
}

export function formatMemoryBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}

export function loadTone(value: number): LoadTone {
  if (value >= 85) {
    return "critical";
  }
  if (value >= 70) {
    return "warning";
  }
  return "normal";
}
