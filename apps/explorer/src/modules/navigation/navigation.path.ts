import type { BreadcrumbSegment } from "./navigation.types";

const DRIVE_ROOT_PATTERN = /^[A-Za-z]:\\$/;

/** Joins a directory and a final path component with a single `\` separator. */
export function joinWindowsPath(parent: string, name: string): string {
  return parent.endsWith("\\") ? `${parent}${name}` : `${parent}\\${name}`;
}

/** Parent directory of `path`. Drive roots (`C:\`) are their own parent. */
export function parentWindowsPath(path: string): string {
  if (DRIVE_ROOT_PATTERN.test(path)) {
    return path;
  }
  const trimmed = path.endsWith("\\") ? path.slice(0, -1) : path;
  const index = trimmed.lastIndexOf("\\");
  if (index < 0) {
    return path;
  }
  const parent = trimmed.slice(0, index);
  return /^[A-Za-z]:$/.test(parent) ? `${parent}\\` : parent;
}

/** Final path component, without a trailing separator. */
export function basename(path: string): string {
  const trimmed = path.endsWith("\\") ? path.slice(0, -1) : path;
  const index = trimmed.lastIndexOf("\\");
  return index < 0 ? trimmed : trimmed.slice(index + 1);
}

export function isDriveRoot(path: string): boolean {
  return DRIVE_ROOT_PATTERN.test(path);
}

/** Splits `path` into clickable breadcrumb segments, drive root first. */
export function toBreadcrumbs(path: string): BreadcrumbSegment[] {
  if (!path) {
    return [];
  }

  const driveMatch = /^([A-Za-z]:)\\(.*)$/.exec(path);
  if (!driveMatch) {
    return [{ label: path, path }];
  }

  const [, drive, rest] = driveMatch;
  const segments: BreadcrumbSegment[] = [{ label: drive ?? "", path: `${drive}\\` }];
  if (!rest) {
    return segments;
  }

  let current = `${drive}\\`;
  for (const part of rest.split("\\").filter(Boolean)) {
    current = joinWindowsPath(current, part);
    segments.push({ label: part, path: current });
  }
  return segments;
}
