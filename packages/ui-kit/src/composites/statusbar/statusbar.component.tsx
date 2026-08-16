import { cn } from "../../lib/cn";
import type { StatusbarProps } from "./statusbar.types";
import { statusbarVariants } from "./statusbar.variants";

export function Statusbar({
  className,
  statusbarStart,
  statusbarEnd,
  idleLabel = "Ready",
  children,
  onContextMenu,
  ...props
}: StatusbarProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: suppress the native context menu on the statusbar
    <footer
      data-slot="statusbar"
      className={cn(statusbarVariants(), className)}
      {...props}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(event);
      }}
    >
      <div data-slot="statusbar-start" className="flex min-w-0 items-center gap-2 truncate">
        {statusbarStart ?? idleLabel}
      </div>

      <div data-slot="statusbar-end" className="ml-auto flex items-center gap-2">
        {statusbarEnd}
      </div>

      {children}
    </footer>
  );
}
