import { cn } from "../../lib/cn";
import type { StatusbarProps } from "./statusbar.types";
import { statusbarVariants, statusbarVersionVariants } from "./statusbar.variants";

export function Statusbar({
  className,
  statusbarStart,
  statusbarEnd,
  version,
  idleLabel = "Ready",
  children,
  ...props
}: StatusbarProps) {
  return (
    <footer data-slot="statusbar" className={cn(statusbarVariants(), className)} {...props}>
      <div data-slot="statusbar-start" className="flex min-w-0 items-center gap-2 truncate">
        {statusbarStart ?? idleLabel}
      </div>

      <div data-slot="statusbar-end" className="ml-auto flex items-center gap-2">
        {statusbarEnd}
        {version ? (
          <span data-slot="statusbar-version" className={statusbarVersionVariants()}>
            {version}
          </span>
        ) : null}
      </div>

      {children}
    </footer>
  );
}
