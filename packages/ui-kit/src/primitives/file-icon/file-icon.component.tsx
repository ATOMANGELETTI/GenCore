import { cn } from "../../lib/cn";
import { FileIconGlyph } from "./file-icon.glyphs";
import { resolveFileIconKind } from "./file-icon.kinds";
import type { FileIconProps } from "./file-icon.types";

export function FileIcon({ nodeKind, extension, open, className }: FileIconProps) {
  const kind = resolveFileIconKind({ nodeKind, extension, open });

  return (
    <svg
      data-slot="file-icon"
      data-kind={kind}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
      focusable="false"
    >
      <FileIconGlyph kind={kind} />
    </svg>
  );
}
